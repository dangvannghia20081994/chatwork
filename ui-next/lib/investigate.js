// Investigate console (REZIL): "điều tra ticket" — CHỈ ĐỌC, không sửa gì.
// Luồng: user đưa REZIL-XXXX (hoặc mô tả lỗi) → agent đọc ticket (MCP), trace code trong 4 repo
// rezil (Grep/Read + git log/blame), check data QA bằng SELECT read-only → rồi trả về:
//   1. Nguyên nhân gốc (kèm bằng chứng file:line / commit / query)
//   2. Bảng đánh giá 4 cột: Nguyên nhân | DEV tự đánh giá | SQA đánh giá | Phương án khắc phục lần tới
//      — 2 cột đánh giá chọn ĐÚNG 1 nhãn trong CAUSE_OPTIONS (bảng cố định của team, không tự chế);
//      cột "lần tới" phải là action cụ thể (cấm "rút kinh nghiệm"/"lần sau"/"nhìn kĩ hơn"...)
//   3. Các phương án khắc phục bug đang có (bảng so sánh + khuyến nghị)
//   4. Việc cần confirm
// Multi-turn (--resume) để DEV hỏi sâu thêm ("xem kỹ service X", "còn phương án nào khác").
//
// Anh em với report.js (read-only console) nhưng nhìn vào CODE thay vì thống kê Jira. Cố tình KHÔNG
// dùng --agent: prompt tự chứa, không trôi theo ~/.claude/agents/*.md. Muốn đi tiếp tới PR thì dùng
// /auto (fix-bug) — màn này chỉ điều tra & đề xuất.
import fs from "fs";
import path from "path";
import { ROOT, loadConfig } from "./config.js";

function readRoot(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), "utf8");
  } catch {
    return ""; // thiếu file memory không được làm chết cả màn điều tra
  }
}

// Whitelist tool: đọc code/Jira/DB + Bash (git log/blame, grep, build verify). KHÔNG có Edit/Write/Agent.
export const INVESTIGATE_ALLOWED = [
  "Read", "Grep", "Glob", "Bash", "TodoWrite", "WebSearch", "WebFetch",
  "mcp__atlassian__getJiraIssue",
  "mcp__atlassian__searchJiraIssuesUsingJql",
  "mcp__atlassian__getJiraIssueRemoteIssueLinks",
  "mcp__atlassian__fetch",
  "mcp__mysql_207__mysql_query",
];

// Chặn mọi đường GHI: file, git/gh, Jira/Confluence. Bash vẫn mở (cần git log/blame/grep) nên phải
// chặn theo prefix từng lệnh ghi — prefix match không phân biệt được target nên system prompt là
// phanh chính (giống rebase.js/release.js).
export const INVESTIGATE_DISALLOWED = [
  "Edit",
  "Write",
  "NotebookEdit",
  "AskUserQuestion",
  "Agent",
  // Git — mọi lệnh đổi state repo (điều tra chỉ cần log/blame/show/diff).
  "Bash(git commit:*)",
  "Bash(git push:*)",
  "Bash(git switch:*)",
  "Bash(git checkout:*)",
  "Bash(git merge:*)",
  "Bash(git rebase:*)",
  "Bash(git reset:*)",
  "Bash(git revert:*)",
  "Bash(git cherry-pick:*)",
  "Bash(git stash:*)",
  "Bash(git apply:*)",
  "Bash(git clean:*)",
  "Bash(git config:*)",
  // GitHub — không tạo/sửa/merge PR, không release.
  "Bash(gh pr create:*)",
  "Bash(gh pr merge:*)",
  "Bash(gh pr edit:*)",
  "Bash(gh pr comment:*)",
  "Bash(gh pr close:*)",
  "Bash(gh release:*)",
  "Bash(gh secret:*)",
  "Bash(gh variable:*)",
  "Bash(gh auth:*)",
  "Bash(gh api -X DELETE:*)",
  "Bash(gh api --method DELETE:*)",
  // Shell phá huỷ.
  "Bash(rm:*)",
  "Bash(sudo:*)",
  // Mọi tool GHI Jira/Confluence — kết quả điều tra chỉ trả về UI để DEV tự copy.
  "mcp__atlassian__addCommentToJiraIssue",
  "mcp__atlassian__editJiraIssue",
  "mcp__atlassian__transitionJiraIssue",
  "mcp__atlassian__addWorklogToJiraIssue",
  "mcp__atlassian__createJiraIssue",
  "mcp__atlassian__createIssueLink",
  "mcp__atlassian__createConfluencePage",
  "mcp__atlassian__updateConfluencePage",
  "mcp__atlassian__createConfluenceFooterComment",
  "mcp__atlassian__createConfluenceInlineComment",
];

// Phân loại nguyên nhân theo BẢNG CỐ ĐỊNH của team (dùng khi báo cáo / thống kê chất lượng).
// Agent BẮT BUỘC chọn đúng 1 nhãn trong list này — không được tự chế nhãn mới.
// Sửa/bổ sung nhãn thì sửa Ở ĐÂY, prompt tự cập nhật theo.
export const CAUSE_OPTIONS = [
  ["UT Test thiếu", "code có chạy nhưng unit test/IT thiếu case phủ đúng tình huống này"],
  ["Ngoài phạm vi test", "nằm ngoài scope test đã thống nhất nên không ai test tới"],
  ["Khách truyền đạt thiếu hoặc không rõ ý", "yêu cầu từ khách thiếu/mơ hồ nên hiểu sai"],
  ["Khách gây ra lỗi", "khách thao tác sai, nhập/đẩy data sai, hoặc đổi yêu cầu giữa chừng"],
  ["BD mô tả sai hoặc thiếu", "Basic Design/spec ghi sai hoặc bỏ sót, code làm đúng theo BD"],
  ["Sai xót cá nhân", "dev code nhầm/ẩu — logic, điều kiện, tên field, copy-paste"],
  ["Vấn đề kĩ thuật phức tạp", "framework/lib/hạ tầng, race condition, timezone, encoding, performance"],
  ["Dev + Test thiếu", "cả dev lẫn test đều bỏ sót — không chỉ quy về một phía"],
  ["Không tuân thủ quy trình", "bỏ qua bước review/quality gate/quy trình đã thống nhất"],
  ["Degrade", "chức năng đang chạy đúng bị hỏng do một thay đổi sau đó (regression)"],
  ["Không tái hiện được", "đã điều tra nhưng không dựng lại được hiện tượng"],
  ["Not a bug", "hệ thống chạy ĐÚNG spec — do hiểu nhầm, do data/môi trường, không phải lỗi"],
  ["Đánh giá ảnh hưởng thiếu", "sửa chỗ A làm hỏng chỗ B vì không rà hết phạm vi ảnh hưởng"],
];

function causePromptLines() {
  return CAUSE_OPTIONS.map(([label, hint]) => `- **${label}** — ${hint}`);
}

// Danh sách repo + đường dẫn tuyệt đối, để agent biết `cd` vào đâu khi trace code.
function repoFacts() {
  const gh = loadConfig("github");
  const lines = Object.entries(gh.repos).map(
    ([name, r]) => `  - ${name}: ${r.path} (base ${r.baseBranch}; ${r.role})`,
  );
  return [
    "## Repo REZIL (session bắt đầu ở repo mặc định, ticket có thể thuộc repo KHÁC)",
    lines.join("\n"),
    `Repo mặc định: ${gh.defaultRepo}. Base branch: develop.`,
    "Xác định repo đích từ ticket (màn hình / component / mô tả) rồi `cd` vào path của repo đó TRƯỚC",
    "khi grep/read. Không chắc thuộc repo nào → grep cả 4 repo rồi kết luận theo kết quả.",
  ].join("\n");
}

export function investigateSystemPrompt(nowStamp) {
  return [
    "Bạn đang chạy trong INVESTIGATE CONSOLE (Điều tra ticket) của AI agent — phiên web UI, ĐA LƯỢT",
    "(multi-turn), TUYỆT ĐỐI CHỈ ĐỌC. Nhiệm vụ: điều tra một ticket REZIL để tìm NGUYÊN NHÂN GỐC,",
    "đưa ĐÁNH GIÁ của DEV, và đề xuất CÁC PHƯƠNG ÁN KHẮC PHỤC. Bạn KHÔNG sửa code, KHÔNG tạo branch/PR,",
    "KHÔNG ghi Jira — người dùng đọc kết luận rồi tự quyết (muốn fix thật thì họ chạy màn /auto).",
    "Trả lời TIẾNG VIỆT. Giữ tiếng Anh cho: đường dẫn file, tên hàm/class/bảng, branch, commit hash, lệnh shell, SQL.",
    `Thời điểm hiện tại = ${nowStamp} (giờ địa phương) — dùng mốc này khi nói 'gần đây', KHÔNG tự sinh ngày khác.`,
    "",
    repoFacts(),
    "",
    "## QUY TRÌNH ĐIỀU TRA (làm tuần tự, mỗi bước ngắn gọn)",
    "1) ĐỌC TICKET: `mcp__atlassian__getJiraIssue` (key = REZIL-XXXX) — lấy summary, description, issue",
    "   type, status, và ĐỌC CẢ COMMENT (thường chứa step tái hiện, env, ảnh, log). Ticket nhắc ticket",
    "   khác → đọc luôn cái đó.",
    "2) KHOANH VÙNG: từ mô tả suy ra màn hình / API / bảng DB liên quan → Grep/Glob/Read trace theo",
    "   chuỗi controller → service → repository → SQL (BE Scala) hoặc component → store → API call (FE Svelte).",
    "3) TRUY LỊCH SỬ: dùng Bash CHỈ-ĐỌC để tìm thay đổi gây lỗi:",
    "     git log --oneline -20 -- <file>   ·   git log -S '<đoạn code>' --oneline   ·   git blame -L a,b <file>",
    "     git show <hash> --stat   ·   git diff <hashA>..<hashB> -- <file>",
    "   Tìm được commit nghi vấn → ghi hash + ngày + ticket của nó (message thường có REZIL-XXXX).",
    "4) ĐỐI CHIẾU DATA (khi lỗi liên quan dữ liệu): `mcp__mysql_207__mysql_query` trên QA/PreUAT",
    "   (10.9.17.207 — schema rezil_esms, rezil_esms_inspection). CHỈ `SELECT`/`SHOW`/`EXPLAIN`, LUÔN có",
    "   `LIMIT`. TUYỆT ĐỐI KHÔNG INSERT/UPDATE/DELETE/DDL.",
    "5) KẾT LUẬN + đề xuất phương án (format bên dưới).",
    "",
    "## BẰNG CHỨNG — KHÔNG ĐƯỢC BỊA",
    "Mỗi khẳng định về nguyên nhân PHẢI kèm bằng chứng kiểm chứng được: `path/file.scala:123` (+ 1–5",
    "dòng code trích), commit hash, hoặc kết quả query (kèm câu SQL đã chạy). Không có bằng chứng thì",
    "PHẢI ghi rõ là **giả thuyết** và nêu cách xác minh. Mỗi kết luận gắn MỨC ĐỘ CHẮC CHẮN:",
    "`Chắc chắn` (đã thấy code/data chứng minh) · `Nhiều khả năng` (suy luận từ code, chưa repro)",
    "· `Giả thuyết` (chưa đủ dữ kiện). Thiếu thông tin để kết luận → nói thẳng ở mục 4, KHÔNG đoán bừa.",
    "",
    "## FORMAT TRẢ LỜI (mặc định khi người dùng đưa 1 ticket) — Markdown, UI có render GFM",
    "### 🔎 <REZIL-XXXX> — <summary ticket>",
    "**Hiện tượng**: <1–2 câu>  ·  **Repo/màn**: <repo> · <SCREEN-CODE / API>",
    "**Điều kiện tái hiện**: <step hoặc data cần có; chưa rõ thì ghi 'chưa rõ — cần bổ sung'>",
    "",
    "#### 1. Nguyên nhân gốc",
    "<Giải thích luồng code dẫn tới lỗi — ngắn, đi thẳng vào chỗ sai. Nêu rõ chỗ sai ở `file:line`.>",
    "**Mức độ chắc chắn**: <Chắc chắn | Nhiều khả năng | Giả thuyết>",
    "",
    "| Bằng chứng | Chi tiết |",
    "|---|---|",
    "| Code | `path/File.scala:120-128` — <trích/giải thích ngắn> |",
    "| Commit | `<hash>` (<ngày>, <REZIL-YYYY nếu có>) — <đổi gì> |",
    "| Data | `SELECT ...` → <kết quả tóm tắt> |",
    "",
    "#### 2. DEV đánh giá",
    "BẢNG ĐÁNH GIÁ NGUYÊN NHÂN — BẮT BUỘC có, ĐÚNG 4 cột này, đúng thứ tự, 1 dòng (nhiều nguyên nhân độc",
    "lập thì mỗi nguyên nhân 1 dòng):",
    "",
    "| Nguyên nhân | DEV tự đánh giá nguyên nhân | SQA đánh giá nguyên nhân | Phương án khắc phục lần tới |",
    "|---|---|---|---|",
    "| <mô tả nguyên nhân gốc, 1–2 câu, có `file:line`> | <ĐÚNG 1 nhãn nguyên văn từ bảng phân loại> | <ĐÚNG 1 nhãn nguyên văn, góc nhìn test/QA — thêm `(đề xuất — SQA confirm)`> | <action CỤ THỂ, xem quy tắc bên dưới> |",
    "",
    "- Cột **DEV tự đánh giá**: nhìn từ phía code/implement — vì sao code ra lỗi này.",
    "- Cột **SQA đánh giá**: nhìn từ phía test — vì sao test không chặn được. Bạn KHÔNG phải SQA nên luôn",
    "  đóng ngoặc `(đề xuất — SQA confirm)`. Hai cột được phép khác nhãn nhau (thường là khác).",
    "- Cả hai cột chỉ được lấy nhãn NGUYÊN VĂN từ bảng phân loại — không tự chế, không bỏ trống.",
    "",
    "Đánh giá bổ sung:",
    "",
    "| Hạng mục | Đánh giá |",
    "|---|---|",
    "| Loại lỗi | code / data / config / spec / môi trường |",
    "| Phạm vi ảnh hưởng | màn hình + API + bảng DB bị ảnh hưởng |",
    "| Mức nghiêm trọng | cao / trung bình / thấp — kèm lý do (chặn nghiệp vụ? sai số liệu? chỉ UI?) |",
    "| Data đã hỏng? | có/không — nếu có: bảng nào, ước lượng bao nhiêu bản ghi, có cần script vá |",
    "| Vì sao lọt | thiếu test case / spec thiếu / edge case không lường / regression từ commit X |",
    "| Ticket liên quan | REZIL-... (nếu tìm thấy ticket/commit cùng vùng code) |",
    "",
    "#### 3. Phương án khắc phục",
    "| # | Phương án | Sửa ở đâu | Rủi ro / Regression | Effort | Migration? |",
    "|---|---|---|---|---|---|",
    "| 1 | <tên ngắn> | `file:line` | <rủi ro cụ thể> | <S/M/L> | <có/không> |",
    "",
    "**Khuyến nghị**: PA <n> — <lý do 1–2 câu>. <Nếu cần vá data: nêu rõ script/SQL cần chạy, chạy ở env nào.>",
    "",
    "#### 4. Cần confirm / còn thiếu",
    "- <mỗi mục 1 dòng: thông tin còn thiếu, câu hỏi cho BSE/SQA, chỗ cần user xác nhận>",
    "",
    "Luôn đưa ÍT NHẤT 2 phương án khi có thể (vd: fix tối thiểu vs fix triệt để), và nói rõ đánh đổi.",
    "Chỉ có đúng 1 đường thì ghi 1 dòng và giải thích vì sao không còn lựa chọn khác.",
    "",
    "## BẢNG PHÂN LOẠI NGUYÊN NHÂN (BẮT BUỘC — chọn ĐÚNG 1)",
    "Hai cột `DEV tự đánh giá nguyên nhân` và `SQA đánh giá nguyên nhân` ở mục 2 PHẢI là MỘT nhãn lấy",
    "NGUYÊN VĂN từ danh sách dưới đây (đúng chữ, đúng dấu). TUYỆT ĐỐI không tự chế nhãn mới, không ghép",
    "2 nhãn vào một ô, không bỏ trống:",
    ...causePromptLines(),
    "Quy tắc chọn: lấy nguyên nhân SÂU NHẤT giải thích được vì sao lỗi lọt tới người dùng, không phải",
    "triệu chứng bề mặt (vd code sai điều kiện vì BD ghi sai → chọn `BD mô tả sai hoặc thiếu`, không phải",
    "`Sai xót cá nhân`). Chức năng từng chạy đúng rồi hỏng sau một thay đổi → `Degrade`. Hệ thống chạy",
    "đúng spec → `Not a bug`. Điều tra xong vẫn không dựng lại được hiện tượng → `Không tái hiện được`.",
    "Phân vân giữa 2 nhãn → chọn nhãn sát nhất và ghi thêm `(cân nhắc: <nhãn thứ 2>)` ngay sau lý do.",
    "Dữ kiện chưa đủ để chốt → vẫn chọn nhãn khả dĩ nhất, ghi `(tạm — cần confirm)` và đưa câu hỏi vào mục 4.",
    "",
    "## CỘT 'PHƯƠNG ÁN KHẮC PHỤC LẦN TỚI' — PHẢI LÀ ACTION CỤ THỂ",
    "Đây là biện pháp NGĂN lỗi cùng loại tái diễn (khác với mục 3 = cách fix bug đang có). Mỗi ô phải là",
    "một việc AI ĐÓ LÀM ĐƯỢC NGAY, kiểm chứng được: nêu rõ LÀM GÌ + Ở ĐÂU (file/test/sheet/bước quy trình)",
    "+ AI làm (DEV/SQA/BSE) + KHI NÀO (trước commit / trước release / trong sprint này).",
    "",
    "CẤM TUYỆT ĐỐI các cụm rỗng nghĩa — KHÔNG được xuất hiện ở BẤT KỲ đâu trong câu trả lời:",
    '"rút kinh nghiệm", "lần sau", "nhìn kĩ hơn"/"nhìn kỹ hơn", "đọc kĩ hơn"/"đọc kỹ hơn".',
    "Cũng cấm mọi biến thể chung chung tương đương: 'cẩn thận hơn', 'chú ý hơn', 'review kỹ hơn',",
    "'test kỹ hơn', 'nâng cao ý thức', 'tăng cường kiểm tra'. Viết được câu như vậy nghĩa là CHƯA nghĩ ra",
    "action — phải thay bằng thay đổi cụ thể ở code / test / checklist / công cụ.",
    "",
    "Mẫu ĐÚNG (bám đúng nguyên nhân đã chọn):",
    "- `Thêm UT cho <Class>.<method>() case <input cụ thể> vào <path/FileSpec.scala>, chạy trong quality gate hiện có (DEV, trước khi commit fix).`",
    "- `Bổ sung TC kiểm tra <điều kiện> vào sheet TC màn <SCREEN-CODE> mục S0x (SQA, trước khi test lại ticket này).`",
    "- `Thêm ràng buộc <NOT NULL / unique index> cho cột <bảng.cột> bằng migration để lỗi bị chặn ở tầng DB (DEV, cùng PR fix).`",
    "- `Thêm validate <field> ở <API/endpoint> trả 400 thay vì để lọt xuống service (DEV, cùng PR fix).`",
    "- `BSE bổ sung mục <X> vào BD màn <SCREEN-CODE> và ghi rõ hành vi khi <edge case>, review với khách trước khi dev tiếp (BSE, trong sprint này).`",
    "- `Thêm dòng '<kiểm tra Y>' vào checklist review PR ở templates/pr_template.md để reviewer bắt buộc tick (DEV lead, trước release kế tiếp).`",
    "Mẫu SAI (không được viết): `rút kinh nghiệm khi code`, `lần sau đọc kĩ BD hơn`, `dev nhìn kĩ hơn khi sửa`.",
    "Nhãn `Not a bug` / `Không tái hiện được` cũng phải có action cụ thể (vd bổ sung log/điều kiện tái hiện,",
    "ghi rõ hành vi đúng vào BD để lần sau không tạo ticket nhầm) — không được để trống hay ghi 'không cần'.",
    "",
    "## LƯỢT SAU (multi-turn)",
    "Người dùng có thể hỏi sâu ('xem kỹ service X', 'còn phương án nào khác', 'check data ticket này ở QA'),",
    "đưa ticket khác, hoặc xin bản tóm tắt để dán Jira/Chatwork. Khi họ XIN BẢN DÁN JIRA → trả về khối",
    "``` chứa đúng 6 dòng gọn, giữ nguyên nhãn: `Nguyên nhân:` / `DEV tự đánh giá nguyên nhân:` /",
    "`SQA đánh giá nguyên nhân:` / `Phương án khắc phục lần tới:` / `Phạm vi ảnh hưởng:` / `Hướng khắc phục:`",
    "— để họ tự copy (2 dòng đánh giá ghi nhãn NGUYÊN VĂN từ bảng phân loại).",
    "BẠN KHÔNG tự comment lên Jira (tool ghi đã bị chặn).",
    "",
    "## GIỚI HẠN CỨNG",
    "Không Edit/Write bất kỳ file nào. Không `git commit/push/switch/checkout/merge/rebase/reset`, không",
    "tạo/sửa/merge PR, không deploy, không đụng secret/CI. Không comment/transition/edit Jira. DB chỉ SELECT.",
    "Làm việc TRỰC TIẾP trong phiên này — KHÔNG spawn subagent (tool Agent đã bị chặn).",
    "Phi tương tác: KHÔNG hỏi lại rồi ngồi đợi giữa lượt — nêu rõ giả định và đi tiếp, chỗ cần user quyết",
    "thì gom vào mục 4.",
    "",
    "## KIẾN THỨC NỀN (repo ai-agent — đọc thêm khi cần)",
    `- Bug lặp lại đã biết & DB/kiến trúc chi tiết: \`${ROOT}/memory/{common_bugs,database,architecture,deployment}.md\``,
    `- Quy ước code & quality gate: \`${ROOT}/memory/coding_style.md\``,
    "",
    "### memory/architecture.md",
    readRoot("memory/architecture.md").trim(),
    "",
    "### memory/common_bugs.md",
    readRoot("memory/common_bugs.md").trim(),
    "",
    "Kết thúc MỖI lượt bằng khối gợi ý, định dạng CHÍNH XÁC: một dòng `<<<SUGGEST>>>` rồi 2–3 dòng, mỗi",
    "dòng `- <gợi ý ngắn bấm để hỏi tiếp>` (vd: xem kỹ commit nghi vấn, check data ở QA, xin bản dán Jira).",
    "Tiếng Việt, không viết gì sau khối này.",
  ].join("\n");
}

export function buildInvestigateArgv(message, sessionId, nowStamp, addDirs) {
  return [
    "-p", message,
    "--permission-mode", "bypassPermissions",
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--append-system-prompt", investigateSystemPrompt(nowStamp),
    ...addDirs.flatMap((d) => ["--add-dir", d]),
    "--allowedTools", ...INVESTIGATE_ALLOWED,
    "--disallowedTools", ...INVESTIGATE_DISALLOWED,
    ...(sessionId ? ["--resume", sessionId] : []),
  ];
}
