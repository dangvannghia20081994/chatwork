// GET /api/sessions?project=rezil|story|film|free — liệt kê các phiên chat đã lưu của project đó.
// Bảo vệ truy cập đã do proxy.js (HTTP Basic Auth) lo; ở đây chỉ đọc file .jsonl read-only.
import { listSessions } from "../../../lib/sessions.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project") || "rezil";
  return Response.json({ sessions: listSessions(project) });
}
