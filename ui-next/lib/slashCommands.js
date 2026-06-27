// Server-side slash-commands shared by every SSE route (chat + auto/job + release/report).
// These short-circuit BEFORE any claude spawn / job-lock so e.g. `/usage` returns instantly and
// never starts a job. Keep this the single source of truth — routes just call maybeSlashResponse().
import { buildLimitsReport } from "./limits.js";
import { buildContextReport } from "./usage.js";

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

// Emit one full report as an SSE stream (delta + end) without spawning claude.
function reportStream(report) {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      c.enqueue(enc.encode(":ok\n\n"));
      c.enqueue(enc.encode(`event: delta\ndata: ${JSON.stringify(report)}\n\n`));
      c.enqueue(enc.encode(`event: end\ndata: {}\n\n`));
      c.close();
    },
  });
}

// If `input` is a recognized slash-command, return a ready SSE Response; otherwise null so the
// caller proceeds with its normal flow. Call this first in a route's GET, before lock/spawn logic.
// opts.session: the resume session id — required by /context (per-session token footprint).
export async function maybeSlashResponse(input, opts = {}) {
  const cmd = (input || "").trim().toLowerCase();
  if (cmd === "/usage" || cmd === "/cost") {
    return new Response(reportStream(await buildLimitsReport()), { headers: SSE_HEADERS });
  }
  if (cmd === "/context") {
    return new Response(reportStream(buildContextReport(opts.session)), { headers: SSE_HEADERS });
  }
  return null;
}
