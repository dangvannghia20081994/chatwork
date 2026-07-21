// GET /api/chat/active?runId=<id> — báo run chat (theo runId) còn đang chạy hay không.
// Dùng khi client mất kết nối (ẩn tab) rồi quay lại: poll cho tới khi run xong thì reload đáp án
// từ session .jsonl. Xem AgentConsole.reconnectAndReload().
import { running } from "../../../../lib/jobs.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const runId = (searchParams.get("runId") || "").trim();
  const j = runId ? running.get(runId) : null;
  const active = !!(j && j.child && j.child.exitCode === null);
  return Response.json({ running: active });
}
