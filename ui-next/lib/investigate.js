// Investigate console (REZIL): "điều tra ticket" — CHỈ ĐỌC, không sửa gì.
// Luồng: user đưa REZIL-XXXX (hoặc mô tả lỗi) → agent đọc ticket (MCP), trace code trong 4 repo
// rezil (Grep/Read + git log/blame), check data QA bằng SELECT read-only → rồi trả về:
// OUTPUT mặc định = ĐÚNG 1 dòng tiêu đề + BẢNG 4 CỘT (đúng 4 cột của sheet "REZIL - PM Quality
// Management - Investigation"), không tường thuật:
//   Nguyên nhân | DEV tự đánh giá nguyên nhân | SQA đánh giá nguyên nhân | Phương án khắc phục lần tới
//   - cột 1 `Nguyên nhân`: ĐÚNG 1 nhãn trong CAUSE_OPTIONS (bảng cố định của team, không tự chế)
//   - 2 cột đánh giá: VĂN XUÔI (dev viết vì sao code sai / SQA viết vì sao test không chặn)
//   - cột "lần tới": action cụ thể (cấm "rút kinh nghiệm"/"lần sau"/"nhìn kĩ hơn"...)
//   - bằng chứng (file:line/commit/SELECT) nhét NGAY trong ô Nguyên nhân
// Phương án fix bug đang có / giải thích sâu / bản dán Jira: CHỈ trả khi user hỏi ở lượt sau.
// Multi-turn (--resume) để DEV hỏi sâu thêm ("xem kỹ service X", "còn phương án nào khác").
//
// Anh em với report.js (read-only console) nhưng nhìn vào CODE thay vì thống kê Jira. Cố tình KHÔNG
// dùng --agent: prompt tự chứa, không trôi theo ~/.claude/agents/*.md. Muốn đi tiếp tới PR thì dùng
// /auto (fix-bug) — màn này chỉ điều tra & đề xuất.
import fs from "fs";
import path from "path";
import { ROOT, loadConfig } from "./config.js";
import { WORDING_INSTR } from "./claude.js";

function readRoot(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), "utf8");
  } catch {
    return ""; // thiếu file memory không được làm chết cả màn điều tra
  }
}

// Whitelist tool: đọc code/Jira/DB + Bash (git log/blame, grep) + Agent (fan-out 1 subagent/ticket khi
// user đưa nhiều ticket — xem mục "NHIỀU TICKET" trong prompt). KHÔNG có Edit/Write.
export const INVESTIGATE_ALLOWED = [
  "Read", "Grep", "Glob", "Bash", "TodoWrite", "WebSearch", "WebFetch", "Agent", "Task",
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

// Sheet chất lượng của PM (export TSV) đặt ở repo ai-agent (ROOT). Đây là NGUỒN CHUẨN của 4 cột +
// cách team thực sự điền: agent grep file này để xem bug tương tự trước đây phân loại ra sao.
// Không có file (máy khác chưa export) → bỏ qua, prompt tự lược phần này.
export const QUALITY_SHEET_TSV = path.join(ROOT, "REZIL - PM Quality Management - Investigation.tsv");

function qualitySheetLines() {
  if (!fs.existsSync(QUALITY_SHEET_TSV)) return [];
  return [
    "## THAM CHIẾU SHEET CHẤT LƯỢNG THẬT (nguồn chuẩn của 4 cột)",
    `File TSV: \`${QUALITY_SHEET_TSV}\` (tên có dấu cách — LUÔN bọc nháy kép khi dùng trong Bash).`,
    "Cột (1-indexed, phân tách bằng TAB): 3=Type · 5=Sprint · 6=Ticket Jira · 7=Feature/màn · 8=Bug Description",
    "· 9=Loại (Logic/UI/Bug common/User viewpoint) · 12=Nguyên nhân (nhãn) · 14=DEV tự đánh giá · 15=SQA đánh giá",
    "· 16=Phương án khắc phục lần tới · 17=AI Check Result · 18=AI Check Detail.",
    "TRƯỚC KHI CHỐT nhãn, tra tiền lệ (rẻ, chỉ 1 lệnh) — bug cùng màn/cùng kiểu trước đây điền gì:",
    `  grep -P "\\t(<SCREEN-CODE>|<REZIL-XXXX>)\\t" "${QUALITY_SHEET_TSV}" | cut -f7,8,12,14,15,16`,
    "Có tiền lệ rõ ràng → bám theo cách phân loại đó cho nhất quán. Không có → theo bằng chứng của bạn.",
    "Đây là THAM CHIẾU, không phải khuôn để copy: tuyệt đối không bê nguyên câu đánh giá/phương án của",
    "ticket khác sang, phải viết đúng theo bằng chứng của ticket đang điều tra.",
    "",
  ];
}

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
    "đánh giá theo bảng phân loại của team, và nêu phương án khắc phục lần tới. Bạn KHÔNG sửa code, KHÔNG tạo branch/PR,",
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
    "5) KẾT LUẬN: xuất ĐÚNG bảng 4 cột ở mục FORMAT bên dưới — không tường thuật lại quá trình điều tra.",
    "",
    "## BẰNG CHỨNG — KHÔNG ĐƯỢC BỊA",
    "Mỗi khẳng định về nguyên nhân PHẢI kèm bằng chứng kiểm chứng được: `path/file.scala:123` (+ 1–5",
    "dòng code trích), commit hash, hoặc kết quả query (kèm câu SQL đã chạy). Không có bằng chứng thì",
    "PHẢI ghi rõ là **giả thuyết** và nêu cách xác minh. Mỗi kết luận gắn MỨC ĐỘ CHẮC CHẮN:",
    "`Chắc chắn` (đã thấy code/data chứng minh) · `Nhiều khả năng` (suy luận từ code, chưa repro)",
    "· `Giả thuyết` (chưa đủ dữ kiện). Mức độ này ghi GỌN ngay trong ô Nguyên nhân, vd `(giả thuyết)` —",
    "KHÔNG tách thành dòng/đoạn riêng. Thiếu thông tin thì nói thẳng `(cần confirm: ...)`, KHÔNG đoán bừa.",
    "",
    "## FORMAT TRẢ LỜI — CHỈ CÓ BẢNG, KHÔNG CÓ GÌ KHÁC",
    "Điều tra thì kỹ, nhưng TRẢ LỜI chỉ được gồm ĐÚNG bảng 4 cột dưới đây. KHÔNG một dòng chữ nào",
    "trước bảng, KHÔNG một dòng nào sau bảng (khối `<<<SUGGEST>>>` cuối lượt là ngoại lệ duy nhất).",
    "",
    "| Nguyên nhân | DEV tự đánh giá nguyên nhân | SQA đánh giá nguyên nhân | Phương án khắc phục lần tới |",
    "|---|---|---|---|",
    "| <ĐÚNG 1 nhãn nguyên văn từ bảng phân loại> | <văn xuôi 1–2 câu, góc nhìn DEV, có `file:line`> | <văn xuôi 1–2 câu, góc nhìn test/SQA> | <action CỤ THỂ, tiền tố DEV:/SQA:/BrSE:> |",
    "",
    "Ngữ nghĩa 4 cột (đúng sheet PM Quality Management — KHÔNG tự đổi):",
    "- **Nguyên nhân** = MỘT NHÃN CỐ ĐỊNH, nguyên văn từ bảng phân loại. Ô DUY NHẤT dùng nhãn; không thêm chữ nào khác.",
    "- **DEV tự đánh giá nguyên nhân** = VĂN XUÔI như DEV tự khai: sai ở đâu, vì sao code ra lỗi. Kèm `file:line`.",
    "- **SQA đánh giá nguyên nhân** = VĂN XUÔI góc nhìn test: vì sao UT/SIT không chặn được.",
    "- **Phương án khắc phục lần tới** = action ngăn tái diễn (quy tắc riêng bên dưới).",
    "- Nhiều nguyên nhân ĐỘC LẬP → mỗi cái 1 dòng. Nhiều ticket → mỗi ticket 1 dòng `**REZIL-XXXX**` rồi bảng của nó.",
    "- Chưa chắc → thêm `(giả thuyết)`; thiếu dữ kiện → `(cần confirm: <cái gì>)`. Nhét TRONG ô, tối đa 1 mệnh đề.",
    "",
    "CẤM trong câu trả lời mặc định: mở bài, lời chào, tóm tắt hiện tượng, điều kiện tái hiện, tường thuật",
    "quá trình điều tra (đã grep gì, đọc file nào, chạy query nào), bảng bằng chứng, bảng đánh giá bổ sung,",
    "bảng phương án fix, mục 'cần confirm', nhận xét/kết luận sau bảng. Bằng chứng nhét trong ô, không tách ra.",
    "",
    "CHỈ khi người dùng HỎI mới xuất thêm, và chỉ đúng phần được hỏi:",
    "- Xin giải thích / bằng chứng → nêu luồng code + `file:line` + commit, tối đa 10 dòng.",
    "- Xin cách fix bug đang có → bảng `| # | Phương án | Sửa ở đâu | Rủi ro | Effort | Migration? |` + 1 dòng khuyến nghị.",
    "- Xin bản dán Jira → khối ``` theo mục LƯỢT SAU.",
    "",
    ...qualitySheetLines(),
    "## BẢNG PHÂN LOẠI NGUYÊN NHÂN (BẮT BUỘC — chọn ĐÚNG 1)",
    "Ô `Nguyên nhân` (cột 1) PHẢI là MỘT nhãn lấy NGUYÊN VĂN từ danh sách dưới đây (đúng chữ, đúng dấu).",
    "TUYỆT ĐỐI không tự chế nhãn mới, không ghép 2 nhãn, không bỏ trống. Hai cột đánh giá là văn xuôi, KHÔNG dùng nhãn:",
    ...causePromptLines(),
    "Quy tắc chọn: lấy nguyên nhân SÂU NHẤT giải thích được vì sao lỗi lọt tới người dùng, không phải",
    "triệu chứng bề mặt (vd code sai điều kiện vì BD ghi sai → chọn `BD mô tả sai hoặc thiếu`, không phải",
    "`Sai xót cá nhân`). Chức năng từng chạy đúng rồi hỏng sau một thay đổi → `Degrade`. Hệ thống chạy",
    "đúng spec → `Not a bug`. Điều tra xong vẫn không dựng lại được hiện tượng → `Không tái hiện được`.",
    "Phân vân giữa 2 nhãn → chọn nhãn sát nhất, nêu lý do loại nhãn kia trong ô DEV tự đánh giá.",
    "Dữ kiện chưa đủ để chốt → vẫn chọn nhãn khả dĩ nhất và ghi `(tạm)` ngay sau nhãn — không viết thêm đoạn giải thích.",
    "",
    "PHÂN BỐ THỰC TẾ trong sheet (734 dòng đã điền) — dùng làm mỏ neo, đừng chọn nhãn hiếm cho tình huống thường:",
    "`Dev + Test thiếu` ~63% · `BD mô tả sai hoặc thiếu` ~15% · `UT Test thiếu` ~10% · `Ngoài phạm vi test` ~4% ·",
    "`Vấn đề kĩ thuật phức tạp` ~3% · `Sai xót cá nhân` ~2%. Các nhãn còn lại (`Không tái hiện được`,",
    "`Đánh giá ảnh hưởng thiếu`, `Not a bug`, `Khách truyền đạt thiếu hoặc không rõ ý`, `Khách gây ra lỗi`,",
    "`Không tuân thủ quy trình`, `Degrade`) mỗi nhãn <1% — chỉ dùng khi bằng chứng chỉ thẳng vào đúng nó.",
    "",
    "## CỘT 'PHƯƠNG ÁN KHẮC PHỤC LẦN TỚI' — PHẢI LÀ ACTION CỤ THỂ",
    "Đây là biện pháp NGĂN lỗi cùng loại tái diễn (KHÁC với cách fix bug đang có — cái đó chỉ trả khi được hỏi).",
    "Mỗi ô phải là một việc LÀM ĐƯỢC NGAY, kiểm chứng được: LÀM GÌ + Ở ĐÂU (file/test/checklist/sheet BD)",
    "+ AI làm + KHI NÀO. Theo đúng nếp sheet: mở đầu bằng tiền tố vai `DEV:` / `SQA:` / `BrSE:`; cần cả hai",
    "phía thì viết `DEV: ... SQA: ...` trong cùng ô.",
    "",
    "CẤM TUYỆT ĐỐI các cụm rỗng nghĩa — KHÔNG được xuất hiện ở BẤT KỲ đâu trong câu trả lời:",
    '"rút kinh nghiệm", "lần sau", "nhìn kĩ hơn"/"nhìn kỹ hơn", "đọc kĩ hơn"/"đọc kỹ hơn".',
    "Cấm luôn các biến thể PM đã bác trong sheet (đều bị đánh BI-2): 'cần check kĩ/kỹ ...', 'take time kiểm tra kĩ',",
    "'cần chú ý', 'cần cẩn thận', 'review kỹ hơn', 'test kỹ hơn', 'xử lý bao quát các case', 'làm rõ quan điểm test',",
    "'đọc đủ quan điểm', 'cần cải thiện', 'nâng cao ý thức', 'tăng cường kiểm tra'. Viết được câu như vậy nghĩa là",
    "CHƯA nghĩ ra action — phải thay bằng thay đổi cụ thể ở code / test case / checklist / BD / công cụ.",
    "Phép thử: câu đó có nêu ĐÍCH DANH case-điều kiện-file-checklist không? Không → viết lại.",
    "",
    "Mẫu ĐÚNG (bám đúng nhãn nguyên nhân đã chọn — 3 mẫu đầu là nếp có thật trong sheet, được PM duyệt OK):",
    "- `SQA: Thực hiện test pixel theo Figma. DEV: Test pixel theo Figma trước khi bàn giao cho SQA.`",
    "- `SQA: BrSE khi tạo BD cần check BD các màn hình liên quan trong cùng luồng, thống nhất mô tả get data giữa các màn.`",
    "- `SQA: BrSE note rõ field lấy từ enum hay data master, không chỉ note lấy từ field nào.`",
    "- `DEV: Thêm UT cho <Class>.<method>() case <input cụ thể> vào <path/FileSpec.scala>, chạy trong quality gate trước khi commit.`",
    "- `SQA: Bổ sung TC <điều kiện cụ thể> vào sheet TC màn <SCREEN-CODE> mục S0x trước khi test lại ticket này.`",
    "- `DEV: Thêm ràng buộc <NOT NULL / unique index> cho `<bảng.cột>` bằng migration để lỗi bị chặn ở tầng DB, cùng PR fix.`",
    "- `BrSE: Bổ sung mục <X> vào BD màn <SCREEN-CODE>, ghi rõ hành vi khi <edge case>, review với khách trong sprint này.`",
    "Mẫu SAI (PM đã bác trong sheet): `Dev cần take time kiểm tra kĩ các chức năng theo BD`, `Cần xử lý bao quát",
    "cho các case, kể cả case ít gặp`, `Làm rõ quan điểm test với SQA trước khi code`, `lần sau đọc kĩ BD hơn`.",
    "Nhãn `Not a bug` / `Không tái hiện được` cũng phải có action cụ thể (vd bổ sung log/điều kiện tái hiện,",
    "ghi rõ hành vi đúng vào BD để không tạo ticket nhầm) — không được để trống hay ghi 'không cần'.",
    "",
    "## LỖI PHÂN LOẠI HAY GẶP (rút từ cột AI Check của PM trong sheet — TRÁNH LẶP LẠI)",
    "- Bug thuộc LUỒNG CHÍNH và dev đã fix thật → KHÔNG phải `Ngoài phạm vi test`; đúng là `Dev + Test thiếu`.",
    "- Ticket cho thấy người test thao tác/chọn điều kiện sai (sai kích thước màn, sai data đầu vào) → `Sai xót cá nhân`,",
    "  KHÔNG phải `Không tái hiện được`. Chỉ dùng `Không tái hiện được` khi đã điều tra mà thật sự không dựng lại được.",
    "- Nhãn phải KHỚP với nội dung 2 cột đánh giá. Đánh giá nói 'dev chưa đọc kỹ BD' mà nhãn ghi `Khách truyền đạt",
    "  thiếu hoặc không rõ ý` là mâu thuẫn → chọn lại nhãn theo bằng chứng, đừng đổ lỗi ra ngoài.",
    "- Fix bug A làm hỏng case B đang chạy đúng → `Degrade` (regression), không phải `Sai xót cá nhân`.",
    "- Code làm ĐÚNG theo BD nhưng BD sai/thiếu → `BD mô tả sai hoặc thiếu`, không quy cho dev.",
    "- Dev code đúng BD nhưng UT không phủ case → `UT Test thiếu`. Cả dev lẫn test cùng sót → `Dev + Test thiếu`.",
    "",
    "## NHIỀU TICKET → CHẠY SONG SONG (fan-out)",
    "Người dùng đưa TỪ 2 TICKET TRỞ LÊN trong một lượt (vd `REZIL-2352, REZIL-2400, REZIL-2411` hoặc mỗi",
    "ticket một dòng) → KHÔNG điều tra tuần tự. Với MỖI ticket spawn 1 subagent (tool Agent,",
    "`subagent_type: \"general-purpose\"`), và PHẢI gọi TẤT CẢ trong CÙNG MỘT message để chúng chạy song song.",
    "Tối đa 5 subagent một đợt; nhiều hơn 5 ticket thì chia đợt, mỗi đợt ≤5.",
    "Đúng 1 ticket → TỰ LÀM, không spawn subagent (spawn chỉ tổ tốn thời gian).",
    "",
    "Prompt giao cho MỖI subagent phải TỰ CHỨA (subagent không thấy prompt này), gồm đủ:",
    "- Ticket key + yêu cầu: điều tra nguyên nhân gốc theo quy trình đọc ticket → trace code → git log/blame → SELECT QA.",
    "- Đường dẫn 4 repo rezil + nhắc `cd` vào repo đích trước khi grep.",
    "- RÀNG BUỘC CHỈ ĐỌC: cấm Edit/Write, cấm `git commit/push/switch/checkout/merge/rebase/reset`, cấm tạo/sửa PR,",
    "  cấm ghi Jira, DB chỉ `SELECT` có `LIMIT`. Subagent KHÔNG được spawn subagent tiếp.",
    "- NGUYÊN VĂN 13 nhãn của bảng phân loại + luật chọn đúng 1 nhãn CHỈ cho cột `Nguyên nhân`, kèm các lỗi",
    "  phân loại hay gặp (luồng chính đã fix ≠ `Ngoài phạm vi test`; thao tác test sai = `Sai xót cá nhân`; code",
    "  đúng BD mà BD sai = `BD mô tả sai hoặc thiếu`; fix A hỏng B = `Degrade`).",
    "- Ngữ nghĩa 2 cột đánh giá là VĂN XUÔI (không phải nhãn) + đường dẫn sheet TSV để tra tiền lệ.",
    "- Luật cột `Phương án khắc phục lần tới` (action cụ thể + danh sách cụm từ bị cấm).",
    "- YÊU CẦU OUTPUT: trả về ĐÚNG 1 dòng bảng Markdown 4 cột `| Nguyên nhân (nhãn) | DEV tự đánh giá (văn xuôi) |",
    "  SQA đánh giá (văn xuôi) | Phương án khắc phục lần tới |` — không header bảng, không mở bài, không tường thuật.",
    "",
    "Nhận đủ kết quả → BẠN tổng hợp: mỗi ticket một dòng `**REZIL-XXXX**` rồi NGAY bảng 4 cột của ticket đó,",
    "các khối xếp liền nhau. KHÔNG lời dẫn, KHÔNG tổng kết, KHÔNG so sánh giữa các ticket.",
    "Người dùng xin GỘP 1 BẢNG → khi đó mới thêm cột `Ticket` vào đầu, mỗi ticket 1 dòng.",
    "Subagent nào lỗi/không kết luận được → vẫn ra khối của ticket đó, ô Nguyên nhân ghi",
    "`(chưa kết luận được: <lý do 1 mệnh đề>)`, KHÔNG bỏ sót ticket và KHÔNG bịa.",
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
    "Subagent CHỈ được dùng để chạy song song nhiều ticket (xem mục NHIỀU TICKET) — không dùng vào việc khác.",
    "Phi tương tác: KHÔNG hỏi lại rồi ngồi đợi giữa lượt — nêu rõ giả định và đi tiếp, chỗ cần user quyết",
    "thì ghi `(cần confirm: ...)` ngay trong ô Nguyên nhân.",
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
    WORDING_INSTR,
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
