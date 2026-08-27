// GET    /api/sessions/[id]?project=…[&console=…]  — dựng lại hội thoại 1 phiên để render + resume.
// DELETE /api/sessions/[id]?project=…[&console=…]  — xoá vĩnh viễn file phiên (+ gỡ nhãn console).
// `console` quyết định thư mục .jsonl cần đọc (evidence/report chạy cwd = ROOT) — xem lib/sessions.js.
import { readSession, deleteSession } from "../../../../lib/sessions.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req, ctx) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project") || "rezil";
  const consoleKey = searchParams.get("console") || undefined;
  const { id } = await ctx.params;
  const data = readSession(project, id, consoleKey);
  if (!data) return Response.json({ error: "Không tìm thấy phiên" }, { status: 404 });
  // `suggests` = chip gợi ý của lượt cuối; client nạp lại để không mất chip khi mở lại phiên hoặc
  // khôi phục sau khi rớt kết nối (event `suggest` chỉ có trong stream đang chạy).
  return Response.json({ id, messages: data.messages, suggests: data.suggests });
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
