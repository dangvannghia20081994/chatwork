// GET    /api/sessions/[id]?project=…  — dựng lại hội thoại 1 phiên để render + resume.
// DELETE /api/sessions/[id]?project=…  — xoá vĩnh viễn file phiên.
import { readSessionMessages, deleteSession } from "../../../../lib/sessions.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req, ctx) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project") || "rezil";
  const { id } = await ctx.params;
  const messages = readSessionMessages(project, id);
  if (!messages) return Response.json({ error: "Không tìm thấy phiên" }, { status: 404 });
  return Response.json({ id, messages });
}

export async function DELETE(req, ctx) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project") || "rezil";
  const { id } = await ctx.params;
  if (!deleteSession(project, id)) {
    return Response.json({ error: "Xoá phiên thất bại" }, { status: 400 });
  }
  return Response.json({ ok: true });
}
