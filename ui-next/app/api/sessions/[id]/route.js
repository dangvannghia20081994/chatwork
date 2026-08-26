// GET    /api/sessions/[id]?project=…[&console=…]  — dựng lại hội thoại 1 phiên để render + resume.
// DELETE /api/sessions/[id]?project=…[&console=…]  — xoá vĩnh viễn file phiên (+ gỡ nhãn console).
// `console` quyết định thư mục .jsonl cần đọc (evidence/report chạy cwd = ROOT) — xem lib/sessions.js.
import { readSessionMessages, deleteSession } from "../../../../lib/sessions.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req, ctx) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project") || "rezil";
  const consoleKey = searchParams.get("console") || undefined;
  const { id } = await ctx.params;
  const messages = readSessionMessages(project, id, consoleKey);
  if (!messages) return Response.json({ error: "Không tìm thấy phiên" }, { status: 404 });
  return Response.json({ id, messages });
}

export async function DELETE(req, ctx) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project") || "rezil";
  const consoleKey = searchParams.get("console") || undefined;
  const { id } = await ctx.params;
  if (!deleteSession(project, id, consoleKey)) {
    return Response.json({ error: "Xoá phiên thất bại" }, { status: 400 });
  }
  return Response.json({ ok: true });
}
