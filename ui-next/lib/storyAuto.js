// Auto mode (Story): free-form task → PR to develop. No Jira. Prompt/tools ported verbatim
// from ui/server.js. Story's own .claude/agents + .mcp.json auto-load via cwd, so Task is allowed.
import { loadConfig } from "./config.js";
import { DISALLOWED_TOOLS, GIT_BRANCH_SAFETY, NO_DEGRADE_SAFETY, WORDING_INSTR } from "./claude.js";

export function storyCfg() { return loadConfig("story"); }
export function currentYYYYMM() { return new Date().toISOString().slice(0, 7); } // e.g. 2026-06

export function assembleStorySystemPrompt() {
  const s = storyCfg();
  const ym = currentYYYYMM();
  return [
    "## NGÔN NGỮ (ưu tiên cao nhất)",
    "Tường thuật/giải thích cho người dùng bằng TIẾNG VIỆT. Giữ tiếng Anh cho mã nguồn, đường dẫn file, lệnh shell, tên branch.",
    "",
    "## VAI TRÒ",
    `Bạn là kỹ sư phần mềm làm việc trên repo "story" (${s.path}).`,
    "Repo có sẵn CLAUDE.md, .claude/agents, .mcp.json — đã được nạp tự động; TUÂN THEO chúng.",
    "ĐƯỢC PHÉP dùng Task để gọi sub-agent của story (story-master + agent từng layer) khi task nặng hoặc chạm ≥2 layer.",
    "",
    "## AUTO MODE — task free-form → PR",
    "Đầu vào là MỘT mô tả task tự do (không phải Jira). Tự suy ra layer + scope từ mô tả và repo.",
    "",
    "## INFO GATE (kiểm tra TRƯỚC khi sửa code)",
    "Nếu task quá mơ hồ / thiếu thông tin để làm an toàn → KHÔNG tạo branch, KHÔNG sửa file.",
    "Xuất khối bắt đầu bằng token CHÍNH XÁC `⛔ NEED-INFO:` kèm liệt kê thiếu gì, rồi DỪNG.",
    "",
    "Nếu đủ thông tin, làm trọn vẹn tới BƯỚC TẠO PR (KHÔNG merge):",
    `1) sync base ${s.baseBranch}, 2) tạo branch <type>/${ym}-<desc-kebab> (type ∈ ${s.branchTypes.join("|")}, suy từ task) bằng \`git switch -c\` NGAY, TRƯỚC khi sửa file,`,
    "3) implement thay đổi tối thiểu (có thể delegate cho agent layer phù hợp),",
    "4) chạy quality gate / lint / test / build của layer liên quan theo story CLAUDE.md — FAIL thì DỪNG, báo lỗi, KHÔNG mở PR,",
    "5) commit (message TIẾNG VIỆT, ngắn, theo style `git log` hiện tại), 6) push bằng ĐÚNG `git push -u origin HEAD`,",
    `7) tạo PR base ${s.baseBranch} (title tiếng Việt ngắn gọn; body: tóm tắt thay đổi + cách test). Ưu tiên \`gh pr create\`.`,
    "",
    GIT_BRANCH_SAFETY,
    "",
    NO_DEGRADE_SAFETY,
    "",
    "## GIỚI HẠN CỨNG",
    "KHÔNG merge PR, KHÔNG deploy, KHÔNG dùng --no-verify, KHÔNG đụng secret/.env thật/CI, KHÔNG force-push `develop`/`main` (force-push nhánh của mình được nếu cần).",
    "Không tự refactor ngoài scope. Buộc sửa shared lib → đánh giá risk + nêu rõ (theo story CLAUDE.md).",
    "Phi tương tác: KHÔNG hỏi lại user; scope mơ hồ thì NÊU GIẢ ĐỊNH rồi làm tiếp (trừ khi rơi vào INFO GATE).",
    "",
    WORDING_INSTR,
  ].join("\n");
}

export function assembleStoryUserPrompt(task) {
  const s = storyCfg();
  return [
    `Thực hiện task sau trong repo "story" (${s.path}), base branch ${s.baseBranch}:`,
    "",
    task,
    "",
    "Theo quy trình AUTO MODE trong system prompt, dừng ở bước tạo PR (KHÔNG merge).",
  ].join("\n");
}

// Auto mode for story: allow Task (story sub-agents) + the project's postgres MCP. Same hard guards.
export const STORY_AUTO_ALLOWED = [
  "Read", "Grep", "Glob", "Edit", "Write", "Bash", "Task", "TodoWrite", "WebSearch", "WebFetch",
  "mcp__postgres-story",
];

export function buildStoryAutoArgv(userPrompt, systemPrompt, addDirs) {
  return [
    "-p", userPrompt,
    "--permission-mode", "auto",
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--append-system-prompt", systemPrompt,
    ...addDirs.flatMap((d) => ["--add-dir", d]),
    "--allowedTools", ...STORY_AUTO_ALLOWED,
    "--disallowedTools", ...DISALLOWED_TOOLS,
  ];
}
