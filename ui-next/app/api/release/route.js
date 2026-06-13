// SSE release endpoint (EventSource → GET): a free-form instruction → the github-ops agent runs it
// via gh CLI (RELEASE_FLOW). Multi-turn via --resume so "confirm before merge" works across turns.
// No timeout: a release may watch a long CI run; the user stops it manually (closing the stream).
import { buildReleaseArgv } from "../../../lib/release.js";
import { claudeSSE, cleanSessionId } from "../../../lib/claude.js";
import { resolveProject } from "../../../lib/config.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  // cwd = default repo; add-dir all 3 rezil repos so github-ops can operate on any of them.
  const proj = resolveProject("rezil");
  const argv = buildReleaseArgv(message, session, nowStamp(), proj.addDirs);
  const stream = claudeSSE({ cwd: proj.cwd, argv, onSession: true });
  return new Response(stream, { headers: SSE_HEADERS });
}
