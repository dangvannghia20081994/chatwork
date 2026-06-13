// SSE chat endpoint (EventSource → GET). Project-aware (rezil | story), read-only or edit.
// Handles the server-side /usage slash-command without spawning claude.
import { buildChatArgv, claudeSSE, cleanSessionId, resolveProject } from "../../../lib/claude.js";
import { buildLimitsReport } from "../../../lib/limits.js";

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
  const project = searchParams.get("project") === "story" ? "story" : "rezil";

  if (!message) {
    return Response.json({ error: "empty message" }, { status: 400 });
  }

  const cmd = message.toLowerCase();
  if (cmd === "/usage" || cmd === "/cost") {
    const enc = new TextEncoder();
    const report = await buildLimitsReport();
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(enc.encode(":ok\n\n"));
        c.enqueue(enc.encode(`event: delta\ndata: ${JSON.stringify(report)}\n\n`));
        c.enqueue(enc.encode(`event: end\ndata: {}\n\n`));
        c.close();
      },
    });
    return new Response(stream, { headers: SSE_HEADERS });
  }

  const proj = resolveProject(project);
  const argv = buildChatArgv(project, message, session, canEdit, proj.addDirs);
  const stream = claudeSSE({ cwd: proj.cwd, argv, onSession: true });
  return new Response(stream, { headers: SSE_HEADERS });
}
