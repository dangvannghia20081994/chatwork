// Chọn account Claude để chạy một lượt chat, tự đổi khi account đang dùng hết quota.
//
// Bối cảnh: pm2 chạy app dưới MỘT account (CLAUDE_ACCOUNT trong ui-next/.env). Khi account đó cạn
// hạn mức, cả console đứng lại dù máy còn account khác còn quota. Ở đây làm phần server-side để
// lượt tiếp theo tự chạy bằng account còn dư, TRÊN CÙNG PHIÊN — transcript được copy sang thư mục
// projects/ của account mới (xem sessions.js ensureSessionInAccount), nên context không mất.
//
// Nguyên tắc fail-open: mọi trường hợp không chắc (token hết hạn, API usage lỗi, copy phiên thất
// bại) đều giữ nguyên account cũ — hành vi y như trước khi có tính năng này, chỉ kèm 1 dòng cảnh báo.
import { currentAccountKey } from "./config.js";
import { accountUsage, pickAccountWithQuota } from "./limits.js";
import { ensureSessionInAccount, sessionCopies } from "./sessions.js";

// Quota còn dưới mức này (%) thì coi như account đã hết.
export const MIN_HEADROOM = 3;

// Dấu hiệu một run bị chặn vì hết hạn mức (dùng để đánh dấu account cạn ngay, khỏi chờ API xác nhận
// ở lượt sau). Khớp trên text lỗi của CLI/API, KHÔNG khớp trên dòng notice của chính ta.
export const LIMIT_RE = /(usage|rate)\s*limit|limit reached|429/i;

// → { acct, notice? }. notice là 1 dòng hiện đầu lượt trong chat (nếu có gì đáng nói).
export async function chooseAccount(project, session) {
  const current = currentAccountKey();
  const cur = await accountUsage(current);

  // Account của pm2 còn quota → chạy bằng nó. NHƯNG phiên có thể đã chạy tiếp ở account khác trong
  // đợt hết quota trước (lượt mới chỉ được ghi vào .jsonl của account đó), nên phải đồng bộ bản mới
  // nhất về đây TRƯỚC khi resume — nếu không, lượt này resume bản cũ và mất hết phần đã làm ở kia.
  if (!cur.ok || cur.headroom >= MIN_HEADROOM) {
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

  const alt = await pickAccountWithQuota({ exclude: [current], minHeadroom: MIN_HEADROOM });
  if (!alt) {
    return {
      acct: current,
      notice: `⚠️ ${current} đã hết quota và không có account nào khác còn dư — lượt này vẫn chạy bằng ${current}.`,
    };
  }

  // Phiên mới (chưa có session id) thì không có gì phải copy.
  const moved = session ? ensureSessionInAccount(project, session, alt.acct) : { ok: true, action: "new" };
  if (!moved.ok) {
    return {
      acct: current,
      notice: `⚠️ ${current} hết quota nhưng không copy được phiên sang ${alt.acct} — vẫn chạy bằng ${current}.`,
    };
  }

  const copied = moved.action === "copied" ? `, đã copy phiên từ ${moved.from}` : "";
  return {
    acct: alt.acct,
    notice: `⚠️ ${current} hết quota (còn ${Math.round(cur.headroom)}%) — chuyển sang ${alt.acct} (còn ${Math.round(alt.headroom)}%)${copied}.`,
  };
}
