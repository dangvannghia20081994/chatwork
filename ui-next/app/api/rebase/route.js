// SSE rebase endpoint (EventSource → GET): a free-form instruction → the git-rebaser agent runs it
// via git CLI. Multi-turn via --resume so "confirm before rebase --continue / force-push" works
// across turns. No timeout: a rebase may pause on conflicts waiting for the user; they stop it
// manually (closing the stream).
import { buildRebaseArgv } from "../../../lib/rebase.js";
import { claudeSSE, cleanSessionId } from "../../../lib/claude.js";
import { maybeSlashResponse } from "../../../lib/slashCommands.js";
import { tagSession } from "../../../lib/sessions.js";
import { resolveProject } from "../../../lib/config.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

// YYYYMMDD-HHMM in local time — passed to git-rebaser for backup-branch naming.
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

  // cwd = default rezil repo; add-dir all 3 rezil repos so git-rebaser can rebase any of them.
  const proj = resolveProject("rezil");
  const argv = buildRebaseArgv(message, session, nowStamp(), proj.addDirs);
  const stream = claudeSSE({
    cwd: proj.cwd,
    argv,
    onSession: true,
    // Xem app/api/investigate/route.js — nhãn console để tách phiên theo màn.
    onEvent: (event, data) => { if (event === "session") tagSession(data, "rebase"); },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
