// SSE evidence endpoint (EventSource → GET): chụp / gán evidence cho test case trên Google Sheet
// SQA theo spec ui-next/app/evidence/SCREEN_EVIDENCE.md (xem lib/evidence.js — spec đọc lúc chạy).
//
// Console CÓ GHI: upload ảnh lên Drive bằng rclone + ghi cột M/N của sheet. Không sửa code repo,
// không git/gh, DB 207 chỉ SELECT.
//
// Multi-turn via --resume: chụp evidence đi theo từng batch, người dùng xem kết quả batch rồi mới
// cho chạy batch tiếp. Không job lock / không timeout — người dùng tự dừng bằng nút ⏹ (đóng stream).
//
// cwd = repo ai-agent (ROOT) vì toàn bộ tool nằm ở đây: scripts/debug.mjs + spec. add-dir thêm 4
// repo rezil để agent tra selector/logic trong source app mobile khi cần.
import fs from "fs";
import { buildEvidenceArgv } from "../../../lib/evidence.js";
import { claudeSSE, cleanSessionId } from "../../../lib/claude.js";
import { maybeSlashResponse } from "../../../lib/slashCommands.js";
import { resolveProject, ROOT } from "../../../lib/config.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

// YYYY-MM-DD HH:MM giờ địa phương — inject để agent không tự sinh "hôm nay" (ngày ghi vào sheet).
function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const message = (searchParams.get("msg") || "").trim();
  const session = cleanSessionId(searchParams.get("session"));
  if (!message) return Response.json({ error: "empty message" }, { status: 400 });

  const slash = await maybeSlashResponse(message, { session });
  if (slash) return slash;

  const proj = resolveProject("rezil");
  if (!fs.existsSync(ROOT)) {
    return Response.json({ error: `Root path not found: ${ROOT}` }, { status: 400 });
  }

  const argv = buildEvidenceArgv(message, session, nowStamp(), proj.addDirs);
  const stream = claudeSSE({ cwd: ROOT, argv, onSession: true });
  return new Response(stream, { headers: SSE_HEADERS });
}
