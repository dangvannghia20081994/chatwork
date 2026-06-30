// File upload for the report console. Saves under .ai-uploads/ inside the project ROOT (the report
// agent runs with cwd = ROOT — see /api/report) so jira-master can Read it via a relative path while
// building a report. Accepts images and Excel, stored verbatim. The report agent stays READ-ONLY
// (no Bash) — it only Reads the saved file. See lib/upload.js.
import { ROOT } from "../../../../lib/config.js";
import { saveUpload } from "../../../../lib/upload.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  let form;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }

  try {
    const meta = await saveUpload(form.get("file"), ROOT);
    return Response.json(meta);
  } catch (e) {
    return Response.json({ error: e.message || "Tải lên thất bại" }, { status: e.status || 500 });
  }
}
