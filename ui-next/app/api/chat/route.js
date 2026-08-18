// SSE chat endpoint (EventSource → GET). Project-aware (rezil | story), read-only or edit.
// Handles the server-side /usage slash-command without spawning claude.
import { buildChatArgv, claudeSSE, cleanSessionId, resolveProject, normalizeProject } from "../../../lib/claude.js";
import { maybeSlashResponse } from "../../../lib/slashCommands.js";
import { running } from "../../../lib/jobs.js";
import { notifyTelegram } from "../../../lib/telegram.js";
import { accountEnv, currentAccountKey } from "../../../lib/config.js";
import { markAccountExhausted } from "../../../lib/limits.js";
import { chooseAccount, LIMIT_RE, isLimitBlocked, isLimitResult } from "../../../lib/accountSwitch.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const message = (searchParams.get("msg") || "").trim();
  const session = cleanSessionId(searchParams.get("session"));
  const canEdit = searchParams.get("edit") === "1";
  const project = normalizeProject(searchParams.get("project"));
  // Client-generated id for this turn. Lets the run survive a dropped connection (tab hidden) yet
  // still be cancellable (Dừng) + queryable (/api/chat/active) via the shared job-lock.
  const runId = (searchParams.get("runId") || "").trim();

  if (!message) {
    return Response.json({ error: "empty message" }, { status: 400 });
  }

  const slash = await maybeSlashResponse(message, { session });
  if (slash) return slash;

  const proj = resolveProject(project);
  const argv = buildChatArgv(project, message, session, canEdit, proj.addDirs);

  // Hết quota → chạy lượt này bằng account khác, vẫn trên cùng phiên: thư mục phiên đã dùng chung
  // qua symlink (scripts/share-projects.sh), project nào chưa symlink thì transcript được copy sang.
  const chosen = await chooseAccount(project, session);
  const runAcct = chosen.acct;
  const env = runAcct === currentAccountKey() ? undefined : accountEnv(runAcct);

  // Accumulate the final answer/status for the Telegram completion ping fired on `end` — cheap
  // no-op via notifyTelegram() when TELEGRAM_BOT_TOKEN/TELEGRAM_NOTIFY_CHAT_IDS aren't set.
  let answer = "";
  let gotResult = false;
  let runError = false;
  const NOTIFY_PREVIEW = 500;

  const stream = claudeSSE({
    cwd: proj.cwd,
    argv,
    env,
    notice: chosen.notice,
    onSession: true,
    // Keep the run alive if the client tab is hidden/minimized (socket drops); it finishes and is
    // saved to the session .jsonl so a reconnecting client can reload the answer. See lib/claude.js.
    killOnDisconnect: false,
    // Register in the shared job-lock under runId so the Dừng button (/api/cancel?repo=runId) and
    // the /api/chat/active status check can find this run even after a disconnect.
    onSpawn: runId ? (child) => running.set(runId, { child, label: "chat" }) : undefined,
    onClose: runId ? () => { running.delete(runId); } : undefined,
    onEvent: (event, data) => {
      if (event === "delta") answer += data;
      // CLI báo bị chặn hạn mức ngay khi request bị từ chối (trước cả event result) → đánh dấu sớm.
      else if (event === "rate_limit") {
        if (isLimitBlocked(data)) markAccountExhausted(runAcct);
      }
      else if (event === "result") {
        gotResult = true;
        runError = !!data.isError;
        // Run bị chặn vì hết hạn mức → đánh dấu account cạn ngay, lượt sau tự đổi account.
        if (isLimitResult(data)) markAccountExhausted(runAcct);
      } else if (
        event === "error_msg" &&
        typeof data === "string" &&
        data !== chosen.notice && // đừng soi dòng notice do CHÍNH ta vừa phát ra ở đầu lượt
        LIMIT_RE.test(data)
      ) {
        markAccountExhausted(runAcct);
      }
      else if (event === "end") {
        const status = runError ? "⚠️ Lỗi" : gotResult ? "✅ Xong" : "⏹ Đã dừng";
        const trimmed = answer.trim();
        const preview = trimmed.length > NOTIFY_PREVIEW ? trimmed.slice(0, NOTIFY_PREVIEW) + "…" : trimmed;
        notifyTelegram(
          `${status} · chat/${project}\n👤 ${message}\n\n${preview || "(không có nội dung)"}`
        ).catch(() => {});
      }
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
