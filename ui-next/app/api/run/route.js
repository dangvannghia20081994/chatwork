// SSE auto-run endpoint (EventSource → GET): a REZIL ticket → implement → PR.
// The agent derives the target repo from the ticket, so we don't know it here — the job lock is
// keyed by TICKET (one job per ticket). cwd = default repo; all rezil repos are --add-dir'd so the
// agent can `cd` into whichever repo the ticket targets. Ported from ui/server.js startRun.
import fs from "fs";
import { assertTicketKey, assembleSystemPrompt, assembleUserPrompt, buildAutoArgv } from "../../../lib/auto.js";
import { resolveProject } from "../../../lib/config.js";
import { claudeSSE } from "../../../lib/claude.js";
import { running } from "../../../lib/jobs.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const ticket = (searchParams.get("ticket") || "").trim();

  try {
    assertTicketKey(ticket);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
  if (running.has(ticket)) {
    return Response.json(
      { error: `busy: ticket "${ticket}" đang có job chạy. Đợi nó xong hoặc bấm Dừng.` },
      { status: 409 }
    );
  }

  const proj = resolveProject("rezil"); // cwd = default repo; addDirs = all rezil repos
  if (!fs.existsSync(proj.cwd)) {
    return Response.json({ error: `Repo path not found: ${proj.cwd}` }, { status: 400 });
  }

  // Reserve the lock synchronously (before the stream is consumed) to close the TOCTOU gap
  // where two concurrent requests both pass running.has() before either spawns.
  const job = { child: null, label: ticket };
  running.set(ticket, job);

  const argv = buildAutoArgv(assembleUserPrompt(ticket), assembleSystemPrompt(), proj.addDirs);
  const stream = claudeSSE({
    cwd: proj.cwd,
    argv,
    timeoutMs: 30 * 60 * 1000,
    onSpawn: (child) => { job.child = child; },
    onClose: (code, child, emit) => {
      emit("result", { exitCode: code });
      if (running.get(ticket) === job) running.delete(ticket);
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
