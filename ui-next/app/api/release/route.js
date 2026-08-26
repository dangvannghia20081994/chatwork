// SSE release endpoint (EventSource → GET): a free-form instruction → the github-ops agent runs it
// via gh CLI (RELEASE_FLOW). Multi-turn via --resume so "confirm before merge" works across turns.
// No timeout: a release may watch a long CI run; the user stops it manually (closing the stream).
import { buildReleaseArgv } from "../../../lib/release.js";
import { claudeSSE, cleanSessionId } from "../../../lib/claude.js";
import { maybeSlashResponse } from "../../../lib/slashCommands.js";
import { tagSession } from "../../../lib/sessions.js";
import { resolveProject, accountEnv, currentAccountKey } from "../../../lib/config.js";
import { markAccountExhausted, markAccountBlocked } from "../../../lib/limits.js";
import { chooseAccount, fallbackAccount, LIMIT_RE, isLimitBlocked, isLimitResult, isBlockedResult, isBlockedText } from "../../../lib/accountSwitch.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Console release chạy trên project "rezil" (cwd = repo mặc định) → thư mục phiên của nó cũng là
// thư mục "rezil". Hằng số này giữ cho chooseAccount/ensureSessionInAccount tra đúng chỗ.
const RELEASE_PROJECT = "rezil";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

// YYYYMMDD-HHMM in local time — passed to github-ops for backup-branch naming.
function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const message = (searchParams.get("msg") || "").trim();
  const session = cleanSessionId(searchParams.get("session"));
  if (!message) return Response.json({ error: "empty message" }, { status: 400 });

  const slash = await maybeSlashResponse(message, { session });
  if (slash) return slash;

  // cwd = default repo; add-dir all 3 rezil repos so github-ops can operate on any of them.
  const proj = resolveProject(RELEASE_PROJECT);
  const argv = buildReleaseArgv(message, session, nowStamp(), proj.addDirs);

  // Hết quota → chạy lượt này bằng account khác, vẫn trên cùng phiên (giống /api/chat). An toàn cho
  // release vì cả 3 account đều có agent github-ops và cùng bộ MCP server (atlassian, gsheets-rezil).
  // Chỉ đổi được Ở ĐẦU LƯỢT: một lượt release đang chạy mà cạn quota thì vẫn hỏng, lượt sau mới nhảy.
  const chosen = await chooseAccount(RELEASE_PROJECT, session, "release");
  let runAcct = chosen.acct;
  const env = runAcct === currentAccountKey() ? undefined : accountEnv(runAcct);

  // Lỗi thuộc về ACCOUNT (org tắt Claude Code / hết hạn mức) → chạy lại ngay trong lượt này bằng
  // account khác, xem claudeSSE({ retry }) và app/api/chat/route.js.
  let acctFailed = null;
  // Chỉ đếm nội dung THẬT: CLI in lỗi account như text của assistant, đếm cả nó thì không bao giờ
  // chạy lại được (xem app/api/chat/route.js).
  let contentLen = 0;

  const stream = claudeSSE({
    cwd: proj.cwd,
    argv,
    env,
    notice: chosen.notice,
    onSession: true,
    // Chạy lại trong cùng lượt khi account vừa dùng không dùng được nữa (xem app/api/chat/route.js).
    retry: async () => {
      if (!acctFailed || contentLen > 0) return null;
      const fb = await fallbackAccount(RELEASE_PROJECT, session, runAcct, acctFailed, "release");
      if (!fb) return null;
      runAcct = fb.acct;
      acctFailed = null;
      return { env: fb.env, notice: fb.notice };
    },
    onEvent: (event, data) => {
      // Gắn nhãn console cho phiên → panel "Phiên đã lưu" của màn này không lẫn phiên màn khác
      // (nhiều console ghi .jsonl chung một thư mục — xem lib/sessions.js).
      if (event === "session") tagSession(data, "release");
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
