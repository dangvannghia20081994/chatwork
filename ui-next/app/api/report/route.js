// SSE report endpoint (EventSource → GET): a free-form instruction → the report agent turns it into
// a JQL, fetches Jira via the LOCAL REST CLI (scripts/jira-search.mjs — not the Atlassian MCP), then
// analyses the compact JSON. Multi-turn via --resume so the user can refine across turns (like /chat
// & /release). No job lock / no timeout — a report is short and read-only; the user stops it by
// closing the stream.
//
// cwd = the ai-agent project ROOT (repo root): the CLI path `ui-next/scripts/jira-search.mjs` is
// relative to it, and the report touches Jira only.
import fs from "fs";
import { buildReportArgv } from "../../../lib/report.js";
import { claudeSSE, cleanSessionId } from "../../../lib/claude.js";
import { maybeSlashResponse } from "../../../lib/slashCommands.js";
import { tagSession } from "../../../lib/sessions.js";
import { ROOT } from "../../../lib/config.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

// YYYY-MM-DD HH:MM local time — injected so the agent doesn't self-generate "today".
function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const message = (searchParams.get("msg") || "").trim();
  const session = cleanSessionId(searchParams.get("session"));
  if (!message) return Response.json({ error: "empty message" }, { status: 400 });

  const slash = await maybeSlashResponse(message, { session });
  if (slash) return slash;

  if (!fs.existsSync(ROOT)) {
    return Response.json({ error: `Project root not found: ${ROOT}` }, { status: 400 });
  }

  const argv = buildReportArgv(message, session, nowStamp(), []);
  const stream = claudeSSE({
    cwd: ROOT,
    argv,
    onSession: true,
    // Xem app/api/investigate/route.js — nhãn console để tách phiên theo màn.
    onEvent: (event, data) => { if (event === "session") tagSession(data, "report"); },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
