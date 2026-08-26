// Evidence console (REZIL - MOBILE): chụp / gán evidence cho test case trên Google Sheet SQA.
//
// Toàn bộ QUY TRÌNH nằm trong spec `ui-next/app/evidence/SCREEN_EVIDENCE.md` — file đó là source of
// truth, được ĐỌC LÚC CHẠY và nhúng nguyên văn vào system prompt. Sửa spec là đổi hành vi màn này
// ngay lượt sau, không cần sửa file này.
//
// Việc agent làm mỗi lượt (rút gọn từ spec):
//   1. Đọc tab sheet → lọc TC thiếu evidence (cột M trống, cột J = OK).
//   2. `rclone lsf` folder Drive của sheet → TC nào ĐÃ có file thì chỉ lấy link, KHÔNG chụp lại.
//   3. TC còn thiếu: dựng pre-condition (SELECT ở DB 207) → chạy `debug.mjs` trên web mobile,
//      khoanh đỏ phần tử của TC → chụp.
//   4. Upload cả batch lên folder Drive (dừng nếu trùng tên) → lấy link từ field `ID` của `lsjson`.
//   5. Ghi cột M bằng HYPERLINK (Sheets API), đọc lại verify, báo TC ghi được / TC skip + lý do.
//
// Anh em với investigate.js (cùng khung AgentConsole + claudeSSE) nhưng đây là console CÓ GHI: ghi
// file ảnh lên Drive và ghi cột M/N của sheet. Không sửa code repo (Edit/Write bị chặn), không
// git/gh, không DML lên DB.
import fs from "fs";
import path from "path";
import { ROOT } from "./config.js";
import { WORDING_INSTR } from "./claude.js";

// Spec nằm cạnh màn /evidence. Đọc lúc chạy để sửa spec là có hiệu lực ngay.
export const SPEC_REL = "ui-next/app/evidence/SCREEN_EVIDENCE.md";

export function readSpec() {
  try {
    return fs.readFileSync(path.join(ROOT, SPEC_REL), "utf8").trim();
  } catch {
    return ""; // thiếu spec → prompt vẫn chạy được, nhưng agent phải dừng và báo (xem prompt)
  }
}

// Tool cần: đọc/chạy script chụp (Bash + Read/Grep/Glob), đọc-ghi sheet (MCP gsheets-rezil),
// SELECT dữ liệu dựng pre-condition (MCP mysql_207). KHÔNG Edit/Write — màn này không sửa code.
export const EVIDENCE_ALLOWED = [
  "Read", "Grep", "Glob", "Bash", "TodoWrite",
  "mcp__gsheets-rezil__list_sheets",
  "mcp__gsheets-rezil__get_sheet_data",
  "mcp__gsheets-rezil__get_sheet_formulas",
  "mcp__gsheets-rezil__find_in_spreadsheet",
  "mcp__gsheets-rezil__update_cells",
  "mcp__gsheets-rezil__batch_update_cells",
  "mcp__gsheets-rezil__batch_update",
  "mcp__mysql_207__mysql_query",
];

// Chặn: sửa code repo, mọi đường git/gh, và các lệnh rclone có thể XOÁ evidence của người khác.
// `rclone copy/copyto/lsf/lsjson` vẫn mở (upload + lấy link theo spec §5); `moveto` mở để rename có
// điều kiện (§7). `rclone link` không chặn ở đây nhưng spec CẤM — lệnh đó cấp quyền anyone-with-link.
export const EVIDENCE_DISALLOWED = [
  "Edit",
  "Write",
  "NotebookEdit",
  "AskUserQuestion",
  // Không sửa code / không đụng lịch sử repo từ màn này.
  "Bash(git commit:*)",
  "Bash(git push:*)",
  "Bash(git switch:*)",
  "Bash(git checkout:*)",
  "Bash(git merge:*)",
  "Bash(git rebase:*)",
  "Bash(git reset:*)",
  "Bash(git revert:*)",
  "Bash(gh pr create:*)",
  "Bash(gh pr merge:*)",
  "Bash(gh release:*)",
  // rclone: được copy/list (+ moveto để rename). delete/move/sync/rmdir đều có thể mất evidence đã có.
  "Bash(rclone delete:*)",
  "Bash(rclone deletefile:*)",
  "Bash(rclone purge:*)",
  "Bash(rclone rmdir:*)",
  "Bash(rclone rmdirs:*)",
  "Bash(rclone move:*)",
  // `moveto` KHÔNG chặn: đó là cách rename file trên Drive, mà rename đã được mở (2026-08-26) với
  // điều kiện người dùng yêu cầu trực tiếp hoặc xác nhận trước — rule ở SCREEN_EVIDENCE.md §7.
  // `move` (cả thư mục) vẫn chặn, và mọi lệnh xoá vẫn chặn.
  "Bash(rclone sync:*)",
  // Destructive shell.
  "Bash(rm:*)",
  "Bash(sudo:*)",
];

export function evidenceSystemPrompt(nowStamp) {
  const spec = readSpec();
  return [
    `Bây giờ là ${nowStamp} (Asia/Ho_Chi_Minh). KHÔNG tự sinh ngày/giờ khác.`,
    "",
    "# VAI TRÒ",
    "Bạn chụp và gán evidence cho test case của team SQA REZIL trên Google Sheet, theo ĐÚNG spec",
    `\`${SPEC_REL}\` được nhúng nguyên văn bên dưới. Spec là source of truth: mọi quy tắc đặt tên file,`,
    "cách ghi cột M, thứ tự các bước, ràng buộc — lấy từ đó, KHÔNG tự chế.",
    "",
    spec
      ? "# SPEC (nguyên văn, tuân thủ tuyệt đối)\n\n" + spec
      : `# SPEC KHÔNG ĐỌC ĐƯỢC\nKhông đọc được \`${ROOT}/${SPEC_REL}\`. DỪNG LẠI, báo người dùng đường dẫn thiếu, KHÔNG tự suy diễn quy trình.`,
    "",
    "# CÁCH LÀM VIỆC Ở CONSOLE NÀY",
    "- Người dùng đưa phạm vi (tên tab + dải TC, ví dụ `MOB-011 TC 507-530`). Không nói rõ tab thì",
    "  hỏi lại 1 câu duy nhất rồi dừng lượt; không tự đoán tab.",
    "- Mở đầu mỗi lượt: in bảng kế hoạch batch — TC nào đã có file trên Drive (chỉ gán link), TC nào",
    "  phải chụp, TC nào cần thao tác ghi dữ liệu lên env (submit/approve...). Rồi mới chạy.",
    "- Bám kích thước batch trong spec. Xong batch thì báo bảng kết quả: TC đã ghi cột M · TC skip +",
    "  lý do · file đã upload. Không tường thuật từng lệnh.",
    "- Số liệu phải LẤY THẬT (đọc sheet, `rclone lsf`, SELECT). Cấm phỏng đoán số đếm hay bịa link.",
    "- Ảnh chụp xong PHẢI tự kiểm: `__mark` trả `marked` mới dùng; `NOTFOUND`/`ZERO-SIZE`/",
    "  `FULL-VIEWPORT` thì sửa selector rồi chụp lại, KHÔNG upload ảnh thiếu khoanh đỏ.",
    "",
    "# GIỚI HẠN CỨNG",
    "- Chỉ ghi cột M (và cột N khi ghi lý do skip). KHÔNG sửa J/K/L, không chèn/xoá dòng, không đụng",
    "  ô công thức thống kê ở row 5–10.",
    "- KHÔNG ghi đè file evidence đã có trên Drive: `rclone lsf | grep <tên file>` trước mỗi upload,",
    "  trùng tên thì DỪNG và báo. Lệnh xoá/di chuyển/sync của rclone đã bị chặn.",
    "- DB 207 chỉ SELECT để dựng/kiểm pre-condition. Không INSERT/UPDATE/DELETE.",
    "- Thao tác trên app làm ĐỔI DỮ LIỆU env (submit báo cáo, approve, xoá...) mà TC không yêu cầu thì",
    "  KHÔNG bấm. TC có yêu cầu thì nêu rõ hệ quả (bản ghi nào, state đổi thế nào) TRƯỚC khi bấm.",
    "- Không sửa code repo (Edit/Write đã bị chặn), không git/gh, không deploy.",
    "- Phi tương tác: không hỏi lại rồi ngồi đợi giữa lượt — nêu giả định và đi tiếp; chỗ buộc người",
    "  dùng quyết thì làm xong phần còn lại rồi ghi rõ `(cần confirm: ...)` ở cuối.",
    "",
    WORDING_INSTR,
    "",
    "Kết thúc MỖI lượt bằng khối gợi ý, định dạng CHÍNH XÁC: một dòng `<<<SUGGEST>>>` rồi 2–3 dòng,",
    "mỗi dòng `- <gợi ý ngắn bấm để làm tiếp>` (vd: chạy batch tiếp, chụp lại TC lỗi selector, đối",
    "chiếu Drive cho dải TC khác). Tiếng Việt, không viết gì sau khối này.",
  ].join("\n");
}

// Console này là việc LẶP theo checklist (dựng trạng thái → khoanh đỏ → chụp → upload → ghi ô), quy
// trình đã viết sẵn trong spec nên không cần budget suy nghĩ mặc định của account. Đo trên 2 phiên
// 2026-08-26: riêng phần model nghĩ giữa các tool đã là 12-21 phút / batch 20 TC. `--effort medium`
// cắt phần đó mà vẫn giữ `model` mặc định (opus): màn này phải dò selector và GHI vào sheet thật,
// hạ hẳn xuống sonnet thì chụp lại còn tốn hơn phần tiết kiệm được. Giống chatSpeedFlags() ở claude.js.
export function buildEvidenceArgv(message, sessionId, nowStamp, addDirs) {
  return [
    "-p", message,
    "--permission-mode", "bypassPermissions",
    "--effort", "medium",
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--append-system-prompt", evidenceSystemPrompt(nowStamp),
    ...addDirs.flatMap((d) => ["--add-dir", d]),
    "--allowedTools", ...EVIDENCE_ALLOWED,
    "--disallowedTools", ...EVIDENCE_DISALLOWED,
    ...(sessionId ? ["--resume", sessionId] : []),
  ];
}
