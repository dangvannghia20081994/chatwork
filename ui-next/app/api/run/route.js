// SSE auto-run endpoint (EventSource → GET): a REZIL ticket → implement → PR.
// Per-repo job lock; one job per repo at a time. Ported from ui/server.js startRun.
import fs from "fs";
import { assertTicketKey, assembleSystemPrompt, assembleUserPrompt, buildAutoArgv } from "../../../lib/auto.js";
import { resolveRepo } from "../../../lib/config.js";
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
  const repoName = searchParams.get("repo") || "";

  let repo;
  try {
    assertTicketKey(ticket);
    repo = resolveRepo(repoName);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
  if (running.has(repo.name)) {
    return Response.json(
      { error: `busy: repo "${repo.name}" đang có job chạy. Chọn repo khác hoặc đợi.` },
      { status: 409 }
    );
  }
  if (!fs.existsSync(repo.path)) {
    return Response.json({ error: `Repo path not found: ${repo.path}` }, { status: 400 });
  }

  const argv = buildAutoArgv(assembleUserPrompt(ticket, repo), assembleSystemPrompt(), [repo.path]);
  const stream = claudeSSE({
    cwd: repo.path,
    argv,
    onSpawn: (child) => running.set(repo.name, { child, label: ticket }),
    onClose: (code, child, emit) => {
      emit("result", { exitCode: code });
      if (running.get(repo.name)?.child === child) running.delete(repo.name);
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
