// Sprint "negative hours" tool — deterministic, server-side, NO agent/Bash/Claude.
// POST multipart: file (.xlsx/.xls) + optional date(YYYY-MM-DD)/to/sprint/link.
// Parses the workbook with lib/sprint.js and returns the ready-to-copy Chatwork block.
import { computeNegativeHours, toChatwork } from "../../../lib/sprint.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024; // 15MB
const EXCEL_EXTS = new Set([".xlsx", ".xls", ".xlsm", ".xlsb"]);

export async function POST(req) {
  let form;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Thiếu tệp Excel" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Tệp quá lớn (tối đa 15MB)" }, { status: 400 });
  }
  const ext = (file.name || "").toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || "";
  if (!EXCEL_EXTS.has(ext)) {
    return Response.json({ error: "Chỉ nhận Excel (.xlsx/.xls)" }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = computeNegativeHours(buf, {
      date: form.get("date") || undefined,
      fileName: file.name,
    });
    const chatwork = toChatwork(result, {
      to: form.get("to") || undefined,
      sprint: form.get("sprint") || undefined,
      link: form.get("link") || undefined,
    });
    return Response.json({
      chatwork,
      people: result.people,
      grand: result.grand,
      dateISO: result.dateISO,
      sprint: form.get("sprint") || result.sprintFromName,
    });
  } catch (e) {
    return Response.json({ error: e.message || "Lỗi xử lý" }, { status: e.status || 500 });
  }
}
