// Health check (parity with ui/server.js /healthz). Lists currently-running auto jobs.
import { running } from "../../../lib/jobs.js";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ ok: true, running: [...running.keys()] });
}
