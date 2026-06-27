// SSE feature-run endpoint (EventSource → GET): a REZIL ticket + BD/Figma context →
// 16-phase feature build → PR(s). Job lock is SHARED with the fix-bug auto run (keyed by repo.name)
// so a single repo working tree never hosts two concurrent branch/commit flows. A feature may also
// touch rezil-esms-lib, so all REZIL repo paths are passed via --add-dir (cwd = the selected repo).
import fs from "fs";
import {
  assertTicketKey,
  assembleFeatureSystemPrompt,
  assembleFeatureUserPrompt,
  buildFeatureAutoArgv,
} from "../../../lib/featureAuto.js";
import { resolveRepo, loadConfig } from "../../../lib/config.js";
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
  const ticket = (searchParams.get("ticket") || "").trim();
  const repoName = searchParams.get("repo") || "";
  const context = searchParams.get("context") || "";

  const slash = await maybeSlashResponse(ticket);
  if (slash) return slash;

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

  // A LIB+BE feature may span repos → give Claude all existing REZIL repo paths via --add-dir.
  const gh = loadConfig("github");
  const addDirs = Object.values(gh.repos)
    .map((r) => r.path)
    .filter((p) => fs.existsSync(p));
  if (!addDirs.includes(repo.path)) addDirs.unshift(repo.path);

  const argv = buildFeatureAutoArgv(
    assembleFeatureUserPrompt(ticket, repo, context),
    assembleFeatureSystemPrompt(),
    addDirs
  );
  const stream = claudeSSE({
    cwd: repo.path,
    argv,
    onSpawn: (child) => running.set(repo.name, { child, label: `feature ${ticket}` }),
    onClose: (code, child, emit) => {
      emit("result", { exitCode: code });
      if (running.get(repo.name)?.child === child) running.delete(repo.name);
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
