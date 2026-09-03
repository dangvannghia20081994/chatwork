// SSE investigate endpoint (EventSource → GET): một ticket REZIL (hoặc mô tả lỗi tự do) → agent điều
// tra nguyên nhân gốc trong code/DB/lịch sử git, đưa bảng đánh giá (DEV/SQA) + phương án khắc phục.
// TOÀN BỘ read-only: không Edit/Write, không git ghi, không ghi Jira (xem lib/investigate.js).
//
// Multi-turn via --resume để DEV hỏi sâu thêm qua từng lượt. Không job lock / không timeout —
// điều tra là read-only, người dùng tự dừng bằng nút ⏹ (đóng stream).
//
// cwd = repo rezil mặc định; add-dir cả 4 repo rezil + ROOT (repo ai-agent) để agent đọc được
// memory/*.md + templates khi cần.
import fs from "fs";
import { buildInvestigateArgv } from "../../../lib/investigate.js";
import { claudeSSE, cleanSessionId } from "../../../lib/claude.js";
import { maybeSlashResponse } from "../../../lib/slashCommands.js";
import { tagSession } from "../../../lib/sessions.js";
import { resolveProject, ROOT, accountEnv, currentAccountKey } from "../../../lib/config.js";
import { markAccountExhausted, markAccountBlocked } from "../../../lib/limits.js";
import { chooseAccount, fallbackAccount, LIMIT_RE, isLimitBlocked, isLimitResult, isBlockedResult, isBlockedText } from "../../../lib/accountSwitch.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Console investigate chạy cwd = repo rezil mặc định → thư mục phiên của nó là thư mục "rezil"
// (KHÔNG thuộc ROOT_CWD_CONSOLES trong lib/sessions.js). Hằng số này giữ cho chooseAccount /
// ensureSessionInAccount tra đúng thư mục .jsonl khi đổi account.
const INVESTIGATE_PROJECT = "rezil";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

// YYYY-MM-DD HH:MM giờ địa phương — inject để agent không tự sinh "hôm nay".
function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const message = (searchParams.get("msg") || "").trim();
  const session = cleanSessionId(searchParams.get("session"));
  if (!message) return Response.json({ error: "empty message" }, { status: 400 });

  const slash = await maybeSlashResponse(message, { session });
  if (slash) return slash;

  const proj = resolveProject("rezil");
  if (!fs.existsSync(proj.cwd)) {
    return Response.json({ error: `Repo path not found: ${proj.cwd}` }, { status: 400 });
  }

  const argv = buildInvestigateArgv(message, session, nowStamp(), [...proj.addDirs, ROOT]);

  // Hết quota → chạy lượt này bằng account khác, vẫn trên cùng phiên (giống /api/chat, /api/release).
  // An toàn cho investigate vì toàn bộ luồng read-only và cả 3 account đều có cùng bộ MCP server
  // (atlassian, mysql_207). Chỉ đổi được Ở ĐẦU LƯỢT hoặc khi lượt chết vì lỗi account (retry bên dưới).
  const chosen = await chooseAccount(INVESTIGATE_PROJECT, session, "investigate");
  let runAcct = chosen.acct;
  const env = runAcct === currentAccountKey() ? undefined : accountEnv(runAcct);

  // Lỗi thuộc về ACCOUNT (org tắt Claude Code / hết hạn mức) → chạy lại ngay trong lượt này bằng
  // account khác, xem claudeSSE({ retry }) và app/api/chat/route.js.
  let acctFailed = null;
  // Chỉ đếm nội dung THẬT: CLI in lỗi account như text của assistant, đếm cả nó thì không bao giờ
  // chạy lại được (xem app/api/chat/route.js).
  let contentLen = 0;
  // hideSubagentText: khi chạy nhiều ticket, mỗi ticket là 1 sub-agent trả về đúng 1 dòng bảng.
  // Không đổ output thô đó ra chat — agent chính tự ráp thành bảng hoàn chỉnh; đổ ra thì vừa trùng,
  // vừa dính nhãn ticket vào cuối đoạn text của sub-agent.
  const stream = claudeSSE({
    cwd: proj.cwd,
    argv,
    env,
    notice: chosen.notice,
    onSession: true,
    hideSubagentText: true,
    // Chạy lại trong cùng lượt khi account vừa dùng không dùng được nữa (xem app/api/chat/route.js).
    retry: async () => {
      if (!acctFailed || contentLen > 0) return null;
      const fb = await fallbackAccount(INVESTIGATE_PROJECT, session, runAcct, acctFailed, "investigate");
      if (!fb) return null;
      runAcct = fb.acct;
      acctFailed = null;
      return { env: fb.env, notice: fb.notice };
    },
    // Gắn nhãn console cho phiên để panel "Phiên đã lưu" của từng màn không lẫn nhau
    // (chat/release/rebase/investigate ghi .jsonl chung một thư mục — xem lib/sessions.js).
    onEvent: (event, data) => {
      if (event === "session") tagSession(data, "investigate");
      if (event === "delta" && !isBlockedText(data) && !LIMIT_RE.test(data)) contentLen += data.length;
      // CLI báo bị chặn hạn mức ngay khi request bị từ chối (trước cả event result) → đánh dấu sớm.
      if (event === "rate_limit") {
        if (isLimitBlocked(data)) markAccountExhausted(runAcct, `rate_limit_event status=${data.status} type=${data.rateLimitType}`);
      } else if (event === "result") {
        // Check "bị org chặn" trước "hết hạn mức" vì cụ thể hơn; cả hai đều để lượt sau đổi account.
        if (isBlockedResult(data)) {
          markAccountBlocked(runAcct, `result text=${String(data.resultText || "").slice(0, 120)}`);
          acctFailed = "bị tổ chức chặn Claude Code";
        } else if (isLimitResult(data)) {
          markAccountExhausted(runAcct, `result api_error_status=${data.apiErrorStatus} text=${String(data.resultText || "").slice(0, 120)}`);
          acctFailed = "hết hạn mức";
        }
      } else if (
        event === "error_msg" &&
        typeof data === "string" &&
        data !== chosen.notice // đừng soi dòng notice do CHÍNH ta vừa phát ra ở đầu lượt
      ) {
        // Lỗi org chặn account đến qua stderr, không có mã 429 nào kèm → chỉ bắt được bằng text.
        if (isBlockedText(data)) {
          markAccountBlocked(runAcct, `error_msg khớp BLOCKED_RE: ${data.slice(0, 120)}`);
          acctFailed = "bị tổ chức chặn Claude Code";
        } else if (LIMIT_RE.test(data)) {
          markAccountExhausted(runAcct, `error_msg khớp LIMIT_RE: ${data.slice(0, 120)}`);
          acctFailed = "hết hạn mức";
        }
      }
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
