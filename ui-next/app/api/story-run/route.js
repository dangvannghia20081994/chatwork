// SSE auto-run for Story (EventSource → GET): free-form task → PR to develop.
// Single job lock under key "story". Ported from ui/server.js startStoryRun.
import fs from "fs";
import { assembleStorySystemPrompt, assembleStoryUserPrompt, buildStoryAutoArgv, storyCfg } from "../../../lib/storyAuto.js";
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
  const task = (searchParams.get("task") || "").trim();
  const s = storyCfg();
  const key = "story";

  if (!task) return Response.json({ error: "empty task" }, { status: 400 });
  if (running.has(key)) {
    return Response.json({ error: "busy: đang có job story chạy. Đợi hoặc Cancel." }, { status: 409 });
  }
  if (!fs.existsSync(s.path)) {
    return Response.json({ error: `Repo path not found: ${s.path}` }, { status: 400 });
  }

  // Reserve the lock synchronously (before the stream is consumed) to close the TOCTOU gap.
  const job = { child: null, label: task.slice(0, 60) };
  running.set(key, job);

  const argv = buildStoryAutoArgv(assembleStoryUserPrompt(task), assembleStorySystemPrompt(), [s.path]);
  const stream = claudeSSE({
    cwd: s.path,
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
