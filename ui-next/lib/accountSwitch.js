// Chọn account Claude để chạy một lượt chat, tự đổi khi account đang dùng hết quota.
//
// Bối cảnh: pm2 chạy app dưới MỘT account (CLAUDE_ACCOUNT trong ui-next/.env). Khi account đó cạn
// hạn mức, cả console đứng lại dù máy còn account khác còn quota. Ở đây làm phần server-side để
// lượt tiếp theo tự chạy bằng account còn dư, TRÊN CÙNG PHIÊN — transcript được copy sang thư mục
// projects/ của account mới (xem sessions.js ensureSessionInAccount), nên context không mất.
//
// Nguyên tắc fail-open: mọi trường hợp không chắc (token hết hạn, API usage lỗi, copy phiên thất
// bại) đều giữ nguyên account cũ — hành vi y như trước khi có tính năng này, chỉ kèm 1 dòng cảnh báo.
import { accountEnv, currentAccountKey } from "./config.js";
import { accountUsage, surveyAccounts } from "./limits.js";
import { ensureSessionInAccount, sessionCopies } from "./sessions.js";

// Quota còn dưới mức này (%) thì coi như account đã hết.
export const MIN_HEADROOM = 3;

// Dấu hiệu một run bị chặn vì hết hạn mức (dùng để đánh dấu account cạn ngay, khỏi chờ API xác nhận
// ở lượt sau). Khớp trên text lỗi của CLI/API, KHÔNG khớp trên dòng notice của chính ta.
// Mỗi bản CLI viết một kiểu — 2.1.235 trả "You've hit your session limit · resets 5:50pm" (hạn mức
// 5h) / "weekly limit" (hạn mức tuần), không có chữ "usage limit" như bản cũ. Vì vậy: (1) regex phủ
// cả session/weekly, (2) đường tin cậy chính là tín hiệu CẤU TRÚC — event rate_limit_event và
// api_error_status=429 (xem isLimitResult + app/api/chat/route.js), text chỉ là lớp dự phòng.
export const LIMIT_RE = /(usage|rate|session|weekly|5-hour|five hour)\s*limit|limit reached|429/i;

// Dấu hiệu account bị CHẶN ở mức tổ chức, không phải hết hạn mức:
//   "Your organization has disabled Claude subscription access for Claude Code · Use an Anthropic
//    API key instead, or ask your admin to enable access"
// Lỗi này không tự hết theo thời gian và API usage vẫn trả quota bình thường, nên phải bắt bằng text
// rồi đánh dấu riêng (markAccountBlocked) — coi là "hết quota" thì sau 60s cache account lại được
// chọn lại và lượt nào cũng chết.
export const BLOCKED_RE = /organi[sz]ation has disabled[^\n]{0,80}claude|subscription access for claude code/i;

// Text lỗi (result / stderr) có phải là lỗi org chặn account không.
export function isBlockedText(text) {
  return BLOCKED_RE.test(String(text || ""));
}

// Event `result` có hỏng vì account bị org chặn không.
export function isBlockedResult(data) {
  return !!data && !!data.isError && isBlockedText(data.resultText);
}

// Event `rate_limit` (từ rate_limit_event của CLI) có báo account bị CHẶN không? "allowed_warning"
// chỉ là cảnh báo sắp hết — vẫn chạy được, không được coi là cạn.
//
// CHỈ `status` mới nói account có bị chặn hay không. `overageStatus` nói về extra usage (mua thêm
// hạn mức khi cạn): org tắt tính năng này thì MỌI run bình thường đều kèm
// `overageStatus: "rejected", overageDisabledReason: "org_level_disabled"` — coi đó là hết quota sẽ
// đánh dấu nhầm account đang còn dư. Đã xảy ra 2026-08-19: acct1 còn ~55% vẫn bị báo "còn 0%" và
// chat tự nhảy sang acct2.
export function isLimitBlocked(info) {
  return !!info && info.status === "rejected";
}

// Event `result` có phải hỏng vì hết hạn mức không (429 hoặc text lỗi khớp LIMIT_RE).
export function isLimitResult(data) {
  if (!data || !data.isError) return false;
  return data.apiErrorStatus === 429 || LIMIT_RE.test(data.resultText || "");
}

// Lý do từng account ứng viên bị loại — để dòng cảnh báo phân biệt "hết quota" (chờ reset) với
// "không kiểm tra được" (token hết hạn, API lỗi — cần đăng nhập/refresh), hai chuyện xử lý khác hẳn.
export function describeSkipped(rows) {
  if (!rows.length) return "máy chỉ khai báo 1 account";
  return rows
    .map((r) =>
      r.ok
        ? `${r.acct} hết quota (còn ${Math.round(r.headroom)}%)`
        : r.blocked
          ? `${r.acct} bị tổ chức chặn Claude Code`
          : `${r.acct} không kiểm tra được: ${r.error || "lỗi không rõ"}`
    )
    .join("; ");
}

// Lượt vừa chạy chết vì LỖI THUỘC VỀ ACCOUNT (org tắt Claude Code, hết hạn mức) → tìm account khác
// để chạy lại NGAY TRONG LƯỢT ĐÓ. Khác `chooseAccount` (chạy ở đầu lượt, dựa trên quota đo được):
// đây là đường xử lý sau khi đã có bằng chứng account hỏng, nên bỏ qua bước đo account vừa chạy.
//
// → { acct, env, notice } để truyền vào claudeSSE({ retry }), hoặc null nếu không có account nào
// thay thế (khi đó lượt kết thúc với lỗi gốc, đúng như trước).
//   failedAcct: account vừa chạy hỏng.  reason: câu mô tả để in trong thông báo.
export async function fallbackAccount(project, session, failedAcct, reason) {
  const { best: alt } = await surveyAccounts({
    exclude: [failedAcct],
    minHeadroom: MIN_HEADROOM,
    allowRefresh: true,
  });
  if (!alt) return null;

  // Phiên phải thấy được ở account mới, nếu không lượt chạy lại sẽ mất context.
  const moved = session ? ensureSessionInAccount(project, session, alt.acct) : { ok: true, action: "new" };
  if (!moved.ok) return null;

  return {
    acct: alt.acct,
    env: accountEnv(alt.acct),
    notice: `⚠️ ${failedAcct} ${reason} — chạy lại lượt này bằng ${alt.acct} (còn ${Math.round(alt.headroom)}%).`,
  };
}

// → { acct, notice? }. notice là 1 dòng hiện đầu lượt trong chat (nếu có gì đáng nói).
export async function chooseAccount(project, session) {
  const current = currentAccountKey();
  const cur = await accountUsage(current);

  // cur.unusable = account của pm2 mất đăng nhập (token + refresh token đều hết hạn/bị xoá), hoặc bị
  // tổ chức chặn Claude Code (cur.blocked). Đây là NGOẠI LỆ của nguyên tắc fail-open: giữ nguyên
  // account lúc này thì lượt nào cũng chết với "OAuth session expired and could not be refreshed" /
  // "your organization has disabled Claude subscription access", đổi account là lựa chọn duy nhất
  // còn chạy. Lỗi mạng / API 5xx vẫn fail-open như cũ (ok:false nhưng unusable:false).
  const curDead = !!cur.unusable;

  // Account của pm2 còn quota → chạy bằng nó. NHƯNG phiên có thể đã chạy tiếp ở account khác trong
  // đợt hết quota trước (lượt mới chỉ được ghi vào .jsonl của account đó), nên phải đồng bộ bản mới
  // nhất về đây TRƯỚC khi resume — nếu không, lượt này resume bản cũ và mất hết phần đã làm ở kia.
  if (!curDead && (!cur.ok || cur.headroom >= MIN_HEADROOM)) {
    if (!session) return { acct: current };
    const back = ensureSessionInAccount(project, session, current);
    if (back.ok) {
      return back.action === "copied"
        ? { acct: current, notice: `ℹ️ Phiên này có phần chạy ở ${back.from} — đã đồng bộ về ${current} trước khi tiếp.` }
        : { acct: current };
    }
    // Không đồng bộ được: bản mới nhất nằm ở account khác. Thà chạy bằng account đó (nếu còn quota)
    // hơn là resume bản cũ và làm mất context.
    const holder = sessionCopies(project, session)[0];
    if (holder && holder.acct !== current) {
      const u = await accountUsage(holder.acct);
      if (u.ok && u.headroom >= MIN_HEADROOM) {
        return {
          acct: holder.acct,
          notice: `ℹ️ Bản mới nhất của phiên nằm ở ${holder.acct} và không copy về được — chạy tiếp bằng ${holder.acct}.`,
        };
      }
      return {
        acct: current,
        notice: `⚠️ Bản mới nhất của phiên nằm ở ${holder.acct} nhưng không copy về được và ${holder.acct} cũng hết quota — lượt này resume bản cũ hơn ở ${current}, có thể thiếu context.`,
      };
    }
    return { acct: current };
  }

  // Account của pm2 đã cạn (hoặc mất đăng nhập) → lượt này hỏng chắc nếu không đổi, nên cho phép
  // refresh token (~15s cho mỗi account quá hạn): thà chờ còn hơn bỏ sót account còn dư chỉ vì
  // token chưa được CLI làm mới.
  const curState = cur.blocked
    ? "bị tổ chức chặn Claude Code"
    : curDead
      ? `mất đăng nhập: ${cur.error}`
      : `hết quota (còn ${Math.round(cur.headroom)}%)`;
  const { best: alt, rows } = await surveyAccounts({
    exclude: [current],
    minHeadroom: MIN_HEADROOM,
    allowRefresh: true,
  });
  if (!alt) {
    const tail = cur.blocked
      ? `lượt này vẫn chạy bằng ${current} và sẽ lỗi — nhờ admin bật lại Claude Code cho ${current}, hoặc dùng Anthropic API key.`
      : curDead
        ? `lượt này vẫn chạy bằng ${current} và nhiều khả năng lỗi xác thực — chạy \`claude auth login\` cho ${current}.`
        : `lượt này vẫn chạy bằng ${current}.`;
    return {
      acct: current,
      notice: `⚠️ ${current} ${curState}, không dùng được account nào khác (${describeSkipped(rows)}) — ${tail}`,
    };
  }

  // Phiên mới (chưa có session id) thì không có gì phải copy.
  const moved = session ? ensureSessionInAccount(project, session, alt.acct) : { ok: true, action: "new" };
  if (!moved.ok) {
    return {
      acct: current,
      notice: `⚠️ ${current} ${curState} nhưng không copy được phiên sang ${alt.acct} — vẫn chạy bằng ${current}.`,
    };
  }

  const copied = moved.action === "copied" ? `, đã copy phiên từ ${moved.from}` : "";
  return {
    acct: alt.acct,
    notice: `⚠️ ${current} ${curState} — chuyển sang ${alt.acct} (còn ${Math.round(alt.headroom)}%)${copied}.`,
  };
}
