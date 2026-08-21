// SSE release endpoint (EventSource → GET): a free-form instruction → the github-ops agent runs it
// via gh CLI (RELEASE_FLOW). Multi-turn via --resume so "confirm before merge" works across turns.
// No timeout: a release may watch a long CI run; the user stops it manually (closing the stream).
import { buildReleaseArgv } from "../../../lib/release.js";
import { claudeSSE, cleanSessionId } from "../../../lib/claude.js";
import { maybeSlashResponse } from "../../../lib/slashCommands.js";
import { resolveProject, accountEnv, currentAccountKey } from "../../../lib/config.js";
import { markAccountExhausted } from "../../../lib/limits.js";
import { chooseAccount, LIMIT_RE, isLimitBlocked, isLimitResult } from "../../../lib/accountSwitch.js";

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
  const chosen = await chooseAccount(RELEASE_PROJECT, session);
  const runAcct = chosen.acct;
  const env = runAcct === currentAccountKey() ? undefined : accountEnv(runAcct);

  const stream = claudeSSE({
    cwd: proj.cwd,
    argv,
    env,
    notice: chosen.notice,
    onSession: true,
    onEvent: (event, data) => {
      // CLI báo bị chặn hạn mức ngay khi request bị từ chối (trước cả event result) → đánh dấu sớm.
      if (event === "rate_limit") {
        if (isLimitBlocked(data)) markAccountExhausted(runAcct, `rate_limit_event status=${data.status} type=${data.rateLimitType}`);
      } else if (event === "result") {
        if (isLimitResult(data)) markAccountExhausted(runAcct, `result api_error_status=${data.apiErrorStatus} text=${String(data.resultText || "").slice(0, 120)}`);
      } else if (
        event === "error_msg" &&
        typeof data === "string" &&
        data !== chosen.notice && // đừng soi dòng notice do CHÍNH ta vừa phát ra ở đầu lượt
        LIMIT_RE.test(data)
      ) {
        markAccountExhausted(runAcct, `error_msg khớp LIMIT_RE: ${data.slice(0, 120)}`);
      }
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
