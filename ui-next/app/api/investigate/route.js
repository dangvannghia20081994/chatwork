// SSE investigate endpoint (EventSource → GET): một ticket REZIL (hoặc mô tả lỗi tự do) → agent điều
// tra nguyên nhân gốc trong code/DB/lịch sử git, đưa bảng đánh giá (DEV/SQA) + phương án khắc phục.
// TOÀN BỘ read-only: không Edit/Write, không git ghi, không ghi Jira (xem lib/investigate.js).
//
// Multi-turn via --resume để DEV hỏi sâu thêm qua từng lượt. Không job lock / không timeout —
// điều tra là read-only, người dùng tự dừng bằng nút ⏹ (đóng stream).
//
// cwd = repo rezil mặc định; add-dir cả 4 repo rezil + ROOT (repo ai-agent) để agent đọc được
// memory/*.md + templates khi cần.
import fs from "fs";
import { buildInvestigateArgv } from "../../../lib/investigate.js";
import { claudeSSE, cleanSessionId } from "../../../lib/claude.js";
import { maybeSlashResponse } from "../../../lib/slashCommands.js";
import { tagSession } from "../../../lib/sessions.js";
import { resolveProject, ROOT } from "../../../lib/config.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

// YYYY-MM-DD HH:MM giờ địa phương — inject để agent không tự sinh "hôm nay".
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
  if (!fs.existsSync(proj.cwd)) {
    return Response.json({ error: `Repo path not found: ${proj.cwd}` }, { status: 400 });
  }

  const argv = buildInvestigateArgv(message, session, nowStamp(), [...proj.addDirs, ROOT]);
  // hideSubagentText: khi chạy nhiều ticket, mỗi ticket là 1 sub-agent trả về đúng 1 dòng bảng.
  // Không đổ output thô đó ra chat — agent chính tự ráp thành bảng hoàn chỉnh; đổ ra thì vừa trùng,
  // vừa dính nhãn ticket vào cuối đoạn text của sub-agent.
  const stream = claudeSSE({
    cwd: proj.cwd,
    argv,
    onSession: true,
    hideSubagentText: true,
    // Gắn nhãn console cho phiên để panel "Phiên đã lưu" của từng màn không lẫn nhau
    // (chat/release/rebase/investigate ghi .jsonl chung một thư mục — xem lib/sessions.js).
    onEvent: (event, data) => { if (event === "session") tagSession(data, "investigate"); },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
