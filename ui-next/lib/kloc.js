// KLOC console: đọc PR đã merge của 4 repo rezil (gh CLI) → tính LoC từng PR → append vào Google
// Sheet `REZIL - KLoc`, tab `KLoC-MVP2`.
//
// Toàn bộ QUY TẮC nằm trong spec `ui-next/app/kloc/KLOC_SPEC.md` — file đó là source of truth, được
// ĐỌC LÚC CHẠY và nhúng nguyên văn vào system prompt. Sửa spec là đổi hành vi ngay lượt sau, không
// cần build/restart (giống lib/evidence.js).
//
// Việc agent làm mỗi lượt (rút gọn từ spec):
//   1. `gh pr list --state merged --base develop` cho cả 4 repo, lọc theo khoảng `mergedAt`.
//   2. Đọc cột E (URL PR) của tab `KLoC-MVP2` → loại PR đã có dòng (chống ghi trùng).
//   3. Parse title `[tag] FEATURE-ID | tên` → Feature ID / Feature Name / Sprint; map author → PIC.
//   4. Append một phát bằng batch_update_cells vào A:M dưới dòng cuối, rồi ĐỌC LẠI verify.
//   5. Báo bảng dòng đã ghi + danh sách skip kèm lý do.
//
// Console CÓ GHI nhưng chỉ ghi Google Sheet: `gh`/`git` chỉ được ĐỌC, không sửa file repo.
import fs from "fs";
import path from "path";
import { ROOT } from "./config.js";
import { WORDING_INSTR } from "./claude.js";

// Spec nằm cạnh màn /kloc. Đọc lúc chạy để sửa spec là có hiệu lực ngay.
export const SPEC_REL = "ui-next/app/kloc/KLOC_SPEC.md";

// Spreadsheet đích + tab. Giữ ở đây để prompt nêu tường minh, còn cấu trúc cột thì ở spec.
export const KLOC_SHEET_ID = "1UkianWTMWCpZaZgBQSC9DJnJqNfE8gwmTTEjQUE369A";
export const KLOC_TAB = "KLoC-MVP2";

export function readSpec() {
  try {
    return fs.readFileSync(path.join(ROOT, SPEC_REL), "utf8").trim();
  } catch {
    return ""; // thiếu spec → prompt vẫn chạy được, nhưng agent phải dừng và báo (xem prompt)
  }
}

// Tool cần: `gh` để đọc PR (Bash), đọc spec (Read/Grep/Glob), đọc-ghi sheet (MCP gsheets-rezil).
// KHÔNG mở Write/Edit: màn này không sửa file nào trong repo, spec do người dùng sửa.
export const KLOC_ALLOWED = [
  "Read", "Grep", "Glob", "Bash", "TodoWrite",
  "mcp__gsheets-rezil__list_sheets",
  "mcp__gsheets-rezil__get_sheet_data",
  "mcp__gsheets-rezil__get_sheet_formulas",
  "mcp__gsheets-rezil__find_in_spreadsheet",
  "mcp__gsheets-rezil__update_cells",
  "mcp__gsheets-rezil__batch_update_cells",
  "mcp__gsheets-rezil__batch_update",
];

// Chặn mọi đường ghi ngoài Google Sheet: sửa code, đụng lịch sử repo, tạo/merge PR, release.
// `gh pr list` / `gh pr view` / `git log` vẫn mở (chỉ đọc).
export const KLOC_DISALLOWED = [
  // Không dùng sub-agent: một lượt /kloc là đọc `gh` + đọc/ghi 1 tab sheet, đủ gọn cho một context.
  // Sub-agent chỉ thêm lượt gọi model mà vẫn phải chuyển số liệu về đây (verify 2026-08-27: lượt
  // chạy thử tự spawn 1 sub-agent chỉ để gọi `gh pr view`).
  "Agent",
  "Write",
  "Edit",
  "NotebookEdit",
  "AskUserQuestion",
  "Bash(git commit:*)",
  "Bash(git push:*)",
  "Bash(git switch:*)",
  "Bash(git checkout:*)",
  "Bash(git merge:*)",
  "Bash(git rebase:*)",
  "Bash(git reset:*)",
  "Bash(git revert:*)",
  "Bash(git tag:*)",
  "Bash(gh pr create:*)",
  "Bash(gh pr merge:*)",
  "Bash(gh pr close:*)",
  "Bash(gh pr edit:*)",
  "Bash(gh release:*)",
  "Bash(gh workflow run:*)",
  "Bash(gh api -X DELETE:*)",
  "Bash(gh api --method DELETE:*)",
  "Bash(rm:*)",
  "Bash(sudo:*)",
];

export function klocSystemPrompt(nowStamp) {
  const spec = readSpec();
  return [
    `Bây giờ là ${nowStamp} (Asia/Ho_Chi_Minh). KHÔNG tự sinh ngày/giờ khác.`,
    "",
    "# VAI TRÒ",
    "Bạn thống kê KLoC cho dự án REZIL: đọc Pull Request đã merge của 4 repo rezil bằng `gh` CLI,",
    "tính LoC từng PR rồi APPEND vào Google Sheet, theo ĐÚNG spec",
    `\`${SPEC_REL}\` được nhúng nguyên văn bên dưới. Spec là source of truth: map cột, cách parse title,`,
    "quy tắc chống trùng, case đặc biệt — lấy từ đó, KHÔNG tự chế.",
    `Sheet đích: \`${KLOC_SHEET_ID}\`, tab \`${KLOC_TAB}\`.`,
    "",
    spec
      ? "# SPEC (nguyên văn, tuân thủ tuyệt đối)\n\n" + spec
      : `# SPEC KHÔNG ĐỌC ĐƯỢC\nKhông đọc được \`${ROOT}/${SPEC_REL}\`. DỪNG LẠI, báo người dùng đường dẫn thiếu, KHÔNG tự suy diễn quy trình.`,
    "",
    "# CÁCH LÀM VIỆC Ở CONSOLE NÀY",
    "- Người dùng đưa phạm vi (khoảng ngày, hoặc danh sách PR cụ thể). Không nêu phạm vi → mặc định",
    "  từ ngày Log Date lớn nhất đang có trên sheet đến hôm nay.",
    "- Mở đầu mỗi lượt: in BẢNG KẾ HOẠCH (PR nào sẽ ghi, PR nào skip + lý do) rồi mới ghi. Người dùng",
    "  chỉ hỏi/liệt kê (không nói ghi) thì DỪNG ở bảng kế hoạch, không ghi gì.",
    "- Số liệu phải LẤY THẬT: `additions`/`deletions` từ `gh`, dòng cuối và cột E từ chính sheet.",
    "  Cấm phỏng đoán số LoC, cấm bịa số dòng hay STT.",
    "- Ghi xong PHẢI đọc lại đúng vùng vừa ghi và đối chiếu (số dòng, `Sum = New + Modified`). Lệch thì",
    "  dừng và báo, không ghi tiếp.",
    "- Không tường thuật từng lệnh; báo theo bảng như spec §10.",
    "",
    "# GIỚI HẠN CỨNG",
    `- Chỉ GHI vào tab \`${KLOC_TAB}\` của spreadsheet \`${KLOC_SHEET_ID}\`, chỉ APPEND xuống dưới dòng`,
    "  cuối. KHÔNG sửa/xoá dòng đã có (kể cả dòng sai — báo người dùng), KHÔNG chèn dòng giữa bảng,",
    "  KHÔNG sort lại bảng, KHÔNG đụng filter view / format.",
    "- KHÔNG ghi vào tab `Overview - MVP2`, `Summary`, `KLoC`, `Metadata`; không tạo/xoá/đổi tên tab;",
    "  không tạo spreadsheet mới.",
    "- `gh`/`git` CHỈ ĐỌC (`pr list`, `pr view`, `log`). Không tạo/merge/đóng/sửa PR, không push, không",
    "  tag, không release, không trigger workflow — phần lớn đã bị chặn ở tool.",
    "- KHÔNG sửa file nào trong repo (Write/Edit đã bị chặn). Cũng không dùng Bash (`>`, `tee`,",
    "  `sed -i`) để ghi đè file nhằm lách giới hạn này. Sai spec thì báo người dùng sửa spec.",
    "- Cột `AI Usage (%)`: lấy từ mục `## AI Usage` trong PR description theo spec §6 (neo theo heading,",
    "  KHÔNG grep `%` trên cả body — dòng checklist có `100%`). PR không có mục đó → để TRỐNG, không",
    "  đoán, không copy từ dòng khác. Người dùng nêu số khác thì theo người dùng.",
    "- Phi tương tác: không hỏi lại rồi ngồi đợi giữa lượt — nêu giả định và đi tiếp; chỗ buộc người",
    "  dùng quyết thì làm xong phần còn lại rồi ghi rõ `(cần confirm: ...)` ở cuối.",
    "",
    WORDING_INSTR,
    "",
    "Kết thúc MỖI lượt bằng khối gợi ý, định dạng CHÍNH XÁC: một dòng `<<<SUGGEST>>>` rồi 2–3 dòng,",
    "mỗi dòng `- <gợi ý ngắn bấm để làm tiếp>` (vd: quét tiếp khoảng ngày khác, điền %AI cho các dòng",
    "vừa ghi, đối chiếu PR còn thiếu của 1 repo). Tiếng Việt, không viết gì sau khối này.",
  ].join("\n");
}

export function buildKlocArgv(message, sessionId, nowStamp, addDirs) {
  return [
    "-p", message,
    "--permission-mode", "bypassPermissions",
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--append-system-prompt", klocSystemPrompt(nowStamp),
    ...addDirs.flatMap((d) => ["--add-dir", d]),
    "--allowedTools", ...KLOC_ALLOWED,
    "--disallowedTools", ...KLOC_DISALLOWED,
    ...(sessionId ? ["--resume", sessionId] : []),
  ];
}
