// Auto mode (AI Film Studio): free-form task → PR to develop. No Jira. Mirrors storyAuto.js,
// but the film repo has no .mcp.json / .claude/agents — so no MCP tool and no Task/sub-agents.
import { loadConfig } from "./config.js";
import { DISALLOWED_TOOLS, GIT_BRANCH_SAFETY } from "./claude.js";

export function filmCfg() { return loadConfig("film"); }
export function currentYYYYMM() { return new Date().toISOString().slice(0, 7); } // e.g. 2026-06

export function assembleFilmSystemPrompt() {
  const f = filmCfg();
  const ym = currentYYYYMM();
  return [
    "## NGÔN NGỮ (ưu tiên cao nhất)",
    "Tường thuật/giải thích cho người dùng bằng TIẾNG VIỆT. Giữ tiếng Anh cho mã nguồn, đường dẫn file, lệnh shell, tên branch.",
    "",
    "## VAI TRÒ",
    `Bạn là kỹ sư phần mềm làm việc trên repo "ai-film-studio" (${f.path}).`,
    "Repo có sẵn CLAUDE.md, AGENTS.md, PLAN.md — đã được nạp tự động; TUÂN THEO chúng.",
    "Stack: Next.js 16 App Router + React 19 + TypeScript (strict) + Prisma/SQLite + Tailwind, worker render qua ComfyUI.",
    "",
    "## AUTO MODE — task free-form → PR",
    "Đầu vào là MỘT mô tả task tự do (không phải Jira). Tự suy ra layer + scope từ mô tả và repo.",
    "",
    "## INFO GATE (kiểm tra TRƯỚC khi sửa code)",
    "Nếu task quá mơ hồ / thiếu thông tin để làm an toàn → KHÔNG tạo branch, KHÔNG sửa file.",
    "Xuất khối bắt đầu bằng token CHÍNH XÁC `⛔ NEED-INFO:` kèm liệt kê thiếu gì, rồi DỪNG.",
    "",
    "Nếu đủ thông tin, làm trọn vẹn tới BƯỚC TẠO PR (KHÔNG merge):",
    `1) sync base ${f.baseBranch}, 2) tạo branch <type>/${ym}-<desc-kebab> (type ∈ ${f.branchTypes.join("|")}, suy từ task) bằng \`git switch -c\` NGAY, TRƯỚC khi sửa file,`,
    "3) implement thay đổi tối thiểu theo convention trong CLAUDE.md/PLAN,",
    "4) chạy quality gate / lint / test (vitest) / build của layer liên quan — FAIL thì DỪNG, báo lỗi, KHÔNG mở PR,",
    "5) commit (message TIẾNG VIỆT, ngắn, theo style `git log` hiện tại), 6) push bằng ĐÚNG `git push -u origin HEAD`,",
    `7) tạo PR base ${f.baseBranch} (title tiếng Việt ngắn gọn; body: tóm tắt thay đổi + cách test). Ưu tiên \`gh pr create\`.`,
    "",
    GIT_BRANCH_SAFETY,
    "",
    "## GIỚI HẠN CỨNG",
    "KHÔNG merge PR, KHÔNG deploy, KHÔNG dùng --no-verify, KHÔNG đụng secret/.env thật/CI, KHÔNG force-push `develop`/`main` (force-push nhánh của mình được nếu cần).",
    "Không tự refactor ngoài scope. Buộc sửa schema/shared lib → đánh giá risk + nêu rõ.",
    "Phi tương tác: KHÔNG hỏi lại user; scope mơ hồ thì NÊU GIẢ ĐỊNH rồi làm tiếp (trừ khi rơi vào INFO GATE).",
  ].join("\n");
}

export function assembleFilmUserPrompt(task) {
  const f = filmCfg();
  return [
    `Thực hiện task sau trong repo "ai-film-studio" (${f.path}), base branch ${f.baseBranch}:`,
    "",
    task,
    "",
    "Theo quy trình AUTO MODE trong system prompt, dừng ở bước tạo PR (KHÔNG merge).",
  ].join("\n");
}

// Auto mode for film: no MCP, no Task/Agent (repo has none). Same hard guards as story.
export const FILM_AUTO_ALLOWED = [
  "Read", "Grep", "Glob", "Edit", "Write", "Bash", "TodoWrite", "WebSearch", "WebFetch",
];

export function buildFilmAutoArgv(userPrompt, systemPrompt, addDirs) {
  return [
    "-p", userPrompt,
    "--permission-mode", "auto",
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--append-system-prompt", systemPrompt,
    ...addDirs.flatMap((d) => ["--add-dir", d]),
    "--allowedTools", ...FILM_AUTO_ALLOWED,
    "--disallowedTools", ...DISALLOWED_TOOLS,
  ];
}
