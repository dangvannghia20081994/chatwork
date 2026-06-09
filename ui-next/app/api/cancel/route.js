// Cancel a running auto job. POST /api/cancel?repo=<name> (omit repo → cancel all).
import { cancel } from "../../../lib/jobs.js";

export const runtime = "nodejs";

export async function POST(req) {
  const { searchParams } = new URL(req.url);
  cancel(searchParams.get("repo") || "");
  return Response.json({ ok: true });
}
