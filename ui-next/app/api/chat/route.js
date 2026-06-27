// SSE chat endpoint (EventSource → GET). Project-aware (rezil | story), read-only or edit.
// Handles the server-side /usage slash-command without spawning claude.
import { buildChatArgv, claudeSSE, cleanSessionId, resolveProject, normalizeProject } from "../../../lib/claude.js";
import { maybeSlashResponse } from "../../../lib/slashCommands.js";

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

  if (!message) {
    return Response.json({ error: "empty message" }, { status: 400 });
  }

  const slash = await maybeSlashResponse(message, { session });
  if (slash) return slash;

  const proj = resolveProject(project);
  const argv = buildChatArgv(project, message, session, canEdit, proj.addDirs);
  const stream = claudeSSE({ cwd: proj.cwd, argv, onSession: true });
  return new Response(stream, { headers: SSE_HEADERS });
}
