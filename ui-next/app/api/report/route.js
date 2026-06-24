// SSE report endpoint (EventSource → GET): a free-form instruction → the jira-master agent builds a
// READ-ONLY Jira report via Atlassian MCP. Multi-turn via --resume so the user can refine across turns
// (like /chat & /release). No job lock / no timeout — a report is short and read-only; the user stops
// it by closing the stream.
//
// cwd = the ai-agent project ROOT (not a rezil repo): the report touches Jira only, and running here
// lets Claude load the project-local jira agents copied into ROOT/.claude/agents.
import fs from "fs";
import { buildReportArgv } from "../../../lib/report.js";
import { claudeSSE, cleanSessionId } from "../../../lib/claude.js";
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
  if (!fs.existsSync(ROOT)) {
    return Response.json({ error: `Project root not found: ${ROOT}` }, { status: 400 });
  }

  const argv = buildReportArgv(message, session, nowStamp(), []);
  const stream = claudeSSE({ cwd: ROOT, argv, onSession: true });
  return new Response(stream, { headers: SSE_HEADERS });
}
