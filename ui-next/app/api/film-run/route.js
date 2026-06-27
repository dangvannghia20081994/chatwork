// SSE auto-run for AI Film Studio (EventSource → GET): free-form task → PR to develop.
// Single job lock under key "film". Mirrors app/api/story-run/route.js.
import fs from "fs";
import { assembleFilmSystemPrompt, assembleFilmUserPrompt, buildFilmAutoArgv, filmCfg } from "../../../lib/filmAuto.js";
import { claudeSSE } from "../../../lib/claude.js";
import { maybeSlashResponse } from "../../../lib/slashCommands.js";
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
  const task = (searchParams.get("task") || "").trim();
  const f = filmCfg();
  const key = "film";

  if (!task) return Response.json({ error: "empty task" }, { status: 400 });

  const slash = await maybeSlashResponse(task);
  if (slash) return slash;

  if (running.has(key)) {
    return Response.json({ error: "busy: đang có job film chạy. Đợi hoặc Cancel." }, { status: 409 });
  }
  if (!fs.existsSync(f.path)) {
    return Response.json({ error: `Repo path not found: ${f.path}` }, { status: 400 });
  }

  // Reserve the lock synchronously (before the stream is consumed) to close the TOCTOU gap.
  const job = { child: null, label: task.slice(0, 60) };
  running.set(key, job);

  const argv = buildFilmAutoArgv(assembleFilmUserPrompt(task), assembleFilmSystemPrompt(), [f.path]);
  const stream = claudeSSE({
    cwd: f.path,
    argv,
    timeoutMs: 30 * 60 * 1000,
    onSpawn: (child) => { job.child = child; },
    onClose: (code, child, emit) => {
      emit("result", { exitCode: code });
      if (running.get(key) === job) running.delete(key);
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
