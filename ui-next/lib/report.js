// Report console: drive the `jira-master` agent (Atlassian MCP) to produce READ-ONLY Jira reports
// — standup, sprint summary, velocity, status breakdown, overdue, ad-hoc JQL. Multi-turn (resume)
// like /chat & /release, so the user can refine ("nhóm theo epic", "thêm story point") across turns.
//
// Mirrors /release's shape (claude -p --agent ... + claudeSSE pump), but the agent is the Jira
// teamlead and EVERY write path is hard-disabled so a "report" can never mutate Jira.
import { loadConfig } from "./config.js";

export const REPORT_AGENT = "jira-master";

// Phân vai member để gom nhóm trong block report Chatwork. Ai KHÔNG thuộc 3 list này → DEV.
// Tên KHỚP CHÍNH XÁC `assignee.displayName` trên Jira (gồm phần tiếng Nhật).
export const LIST_BSE = [
    "HTJ - AnhTT",
    "HTJ - BieuNV",
    "HTV - DatHM",
    "Nguyen Thuy Quynh（クイン）",
]
export const LIST_SQA = [
  "HTV - HoaNT",
  "HTV - HuyenNT",
  "HTV - YenLTB",
  "HTV - NgocTTB",
]
export const LIST_COMTOR = [
  "HTV - NamNP",
]
// Read-only: hard-deny every Jira/Confluence WRITE tool + all local mutation/escape tools. The
// agent (and any read sub-agent it spawns, e.g. jira-reporter/jira-analyst) can only search/read.
// Agent IS left enabled so jira-master can delegate to its reporter/analyst sub-agents; the write
// MCP tools below are blocked globally, so a sub-agent can't write either.
export const REPORT_DISALLOWED = [
  "Edit",
  "Write",
  "NotebookEdit",
  "Bash",
  "AskUserQuestion",
  // No delegation: jira-master must run the searches itself so the field/format discipline below
  // applies. Delegating to jira-searcher (which pulls default fields incl. ADF description) is what
  // blew past the token limit and spilled results to a file the read-only sub-agent couldn't read.
  "Agent",
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

// displayName → vai trò ("BSE" | "SQA" | "COMTOR" | "DEV"); không khớp list nào → DEV.
export function roleOf(displayName) {
  const n = (displayName || "").trim();
  if (LIST_BSE.includes(n)) return "BSE";
  if (LIST_SQA.includes(n)) return "SQA";
  if (LIST_COMTOR.includes(n)) return "COMTOR";
  return "DEV";
}

// Mô tả roster gọn để nhúng vào system prompt (agent không tự biết ai vai gì).
function rosterPromptLines() {
  return [
    `- BSE: ${LIST_BSE.join(", ")}`,
    `- SQA: ${LIST_SQA.join(", ")}`,
    `- COMTOR (dịch): ${LIST_COMTOR.join(", ")}`,
    "- DEV: MỌI assignee KHÔNG nằm trong 3 nhóm trên.",
  ];
}

// Console-specific config only — Jira search/report know-how lives in the jira-master agent
// (~/.claude/agents/jira-master.md), loaded via --agent. We inject the current date (the agent must
// not self-generate one) + read-only console-mode rules here.
export function reportSystemPrompt(nowStamp) {
  const jira = loadConfig("jira");
  const q = (names) => names.map((n) => `"${n}"`).join(",");
  const inBSE = q(LIST_BSE);
  const inSQA = q(LIST_SQA);
  const inCOMTOR = q(LIST_COMTOR);
  const notDev = q([...LIST_BSE, ...LIST_SQA, ...LIST_COMTOR]); // DEV = không thuộc các nhóm này
  return [
    "Bạn đang chạy trong Report Console của AI agent — phiên web UI, ĐA LƯỢT (multi-turn), CHỈ ĐỌC.",
    "Nhiệm vụ: tạo BÁO CÁO Jira theo yêu cầu — dựng JQL phù hợp, query qua Atlassian MCP",
    "(searchJiraIssuesUsingJql + getJiraIssue), rồi TỔNG HỢP gọn. Có thể giao jira-reporter/jira-analyst.",
    `Project mặc định: ${jira.project} · site ${jira.site}. Mọi JQL mặc định giới hạn trong \`project = ${jira.project}\` trừ khi người dùng nêu filter/JQL khác.`,
    "Filter Jira đã biết (khi người dùng nhắc tên env này → dùng đúng filter id, JQL `filter=<id>`):",
    "- PreUAT-MVP2-A → filter=10652",
    "- UAT-MVP2-A → filter=10695",
    `Hôm nay = ${nowStamp} (giờ địa phương). Dùng mốc này cho các khái niệm 'hôm nay'/'tuần này'/quá hạn; KHÔNG tự sinh ngày khác.`,
    "",
    "## TỆP ĐÍNH KÈM",
    "Người dùng có thể đính kèm tệp (đường dẫn nằm trong `.ai-uploads/...`): ảnh hoặc Excel.",
    "Hãy ĐỌC tệp trực tiếp bằng tool Read (Read tự phân tích được cả Excel/ảnh) rồi dùng dữ liệu đó để",
    "đối chiếu/bổ sung báo cáo (so sánh số liệu Jira với file, đối chiếu chéo giữa các sheet…). Chỉ đọc — không sửa tệp.",
    "",
    "## CHỈ ĐỌC (quan trọng)",
    "TUYỆT ĐỐI không comment/transition/edit/tạo ticket-link/worklog, không sửa file, không chạy lệnh shell, không git.",
    "Đây là công cụ báo cáo — chỉ search/đọc Jira. Nếu người dùng yêu cầu thao tác ghi → từ chối ngắn gọn,",
    "nhắc rằng màn Report chỉ đọc (có thể dùng màn khác).",
    "",
    "## CÁCH QUERY (BẮT BUỘC — tránh response quá lớn bị cắt/lưu-file)",
    "- TỰ chạy mcp__atlassian__searchJiraIssuesUsingJql; KHÔNG giao sub-agent (để kiểm soát tham số).",
    "- LUÔN truyền `fields` tối thiểu, vd [\"summary\",\"status\",\"assignee\",\"issuetype\",\"priority\",\"resolutiondate\",\"duedate\",\"labels\"].",
    "  TUYỆT ĐỐI KHÔNG lấy `description`/`comment`/`changelog`/`*all` (phình response → vượt token limit → bị lưu ra file).",
    "- LUÔN đặt `responseContentFormat: \"markdown\"`.",
    "- ĐẾM = chạy JQL hẹp với `fields:[\"summary\"]` + `maxResults:50`, rồi ĐẾM số phần tử `issues` trả về.",
    "  Response chỉ có summary nên rất nhỏ. KHÔNG bao giờ lấy `assignee`/nhiều field rồi tự gom (assignee có",
    "  avatarUrls → 1 query 31 issue đã ~80k ký tự, vượt token limit, bị lưu ra file). KHÔNG dùng computeIssueCount.",
    "- Nếu `isLast=false` (còn trang) → sang trang bằng nextPageToken và CỘNG DỒN số đếm cho đủ.",
    "- Cần đếm theo nhiều nhóm/status → chạy nhiều JQL hẹp riêng (mỗi cái 1 con số), KHÔNG kéo hết rồi tự đếm.",
    "- Nếu một kết quả tool VẪN quá lớn và bị LƯU RA FILE (đường dẫn .../tool-results/...): đọc bằng Read (offset/limit)",
    "  hoặc đếm bằng Grep — KHÔNG bỏ cuộc, KHÔNG giao agent khác.",
    "",
    "## PHÂN VAI MEMBER (để gom nhóm report)",
    "Dựa vào `assignee.displayName` (khớp CHÍNH XÁC), phân mỗi người vào 1 nhóm:",
    ...rosterPromptLines(),
    "",
    "## CÁC JQL ĐẾM CHO BLOCK (thay <id> = filter của env, vd 10695; mỗi câu fields:[\"summary\"], maxResults:50, đếm issues)",
    "- Tổng N:            `filter=<id>`",
    "- closed/pending Z:  `filter=<id> AND status IN (Closed, PENDING)`",
    "- mới hôm nay X:     `filter=<id> AND created >= startOfDay()`",
    `- DEV còn:           \`filter=<id> AND status NOT IN (Closed, PENDING) AND (assignee NOT IN (${notDev}) OR assignee IS EMPTY)\``,
    `- SQA còn:           \`filter=<id> AND status NOT IN (Closed, PENDING) AND assignee IN (${inSQA})\``,
    `- BSE còn:           \`filter=<id> AND status NOT IN (Closed, PENDING) AND assignee IN (${inBSE})\``,
    `- BSE cần confirm:   \`filter=<id> AND status = FEEDBACK AND assignee IN (${inBSE})\``,
    `- COMTOR còn:        \`filter=<id> AND status NOT IN (Closed, PENDING) AND assignee IN (${inCOMTOR})\``,
    "Kiểm tra: (DEV còn)+(SQA còn)+(BSE còn)+(COMTOR còn) phải = N − Z. Lệch → rà lại JQL, KHÔNG báo số sai.",
    "",
    "## OUTPUT MẶC ĐỊNH = BLOCK CHATWORK (để copy-paste)",
    "Với báo cáo tổng quan/thống kê trạng thái của một env (vd UAT-MVP2-A), TRẢ VỀ block Chatwork theo",
    "ĐÚNG format dưới — dùng thẻ Chatwork `[To:]`, `[info]`, `[title]`, `[hr]`, `[/info]` và emoji theo nhóm.",
    "Đặt CẢ block trong khối ``` để người dùng copy nguyên văn:",
    "```",
    "[To:6040320]Le Ngoc Chien",
    "Em gửi report <TÊN ENV> ngày <DD/MM> ạ",
    "[info][title]📊 Report <TÊN ENV> — <DD/MM>[/title]",
    "Tổng <N> ticket · <X> mới hôm nay · <Z> closed/pending",
    "[hr]",
    "🔧 DEV — còn <a> (<breakdown nếu có: chưa build DEV1 / đang làm / chưa làm>)",
    "🧪 SQA — còn <b>",
    "👔 BSE — còn <c> (<vd: m cần confirm>)",
    "🌐 <tên COMTOR> (dịch) — còn <d>",
    "[/info]",
    "```",
    "Quy tắc tính (BẮT BUỘC, số phải KHỚP query):",
    "- `<N>` = tổng ticket trong scope (filter của env).",
    "- 'còn' (đang còn) = ticket có status NOT IN (Closed, PENDING). Closed + PENDING gộp vào `<Z> closed/pending`.",
    "- Mỗi dòng emoji là tổng 'đang còn' của các assignee theo nhóm; tổng 4 dòng = N − Z (closed/pending).",
    "- `<X>` mới hôm nay BẮT BUỘC có: chạy 1 JQL count RIÊNG `filter=<id> AND created >= startOfDay()`",
    "  (lấy total) và LUÔN ghi ở dòng `Tổng …` — kể cả X = 0.",
    "- 'cần confirm' (BSE) thường là status FEEDBACK.",
    "- COMTOR: dùng tên rút gọn (vd 'Nam' cho 'HTV - NamNP').",
    "- Dòng `Tổng …`: `mới hôm nay` và `closed/pending` LUÔN ghi; mục không chắc (vd 'chuyển từ PreUAT') thì",
    "  bỏ qua, KHÔNG bịa. Nhóm có 0 ticket đang còn → bỏ dòng emoji đó.",
    "Người dùng có thể đổi env, người nhận `[To:]`, hoặc xin 'báo cáo chi tiết' (bảng markdown từng ticket) —",
    "khi đó trả markdown thay vì block. Số liệu phải KHỚP query; query rỗng → nói rõ 'không có ticket khớp'.",
    "",
    "Kết thúc MỖI lượt bằng khối gợi ý, định dạng CHÍNH XÁC: một dòng `<<<SUGGEST>>>` rồi 2–3 dòng, mỗi dòng",
    "`- <gợi ý ngắn bấm để hỏi/báo cáo tiếp>` (vd đổi env, xem chi tiết nhóm DEV, đổi người nhận). Tiếng Việt,",
    "không viết gì sau khối này.",
  ].join("\n");
}

export function buildReportArgv(message, sessionId, nowStamp, addDirs) {
  return [
    "-p", message,
    "--agent", REPORT_AGENT,
    "--permission-mode", "bypassPermissions",
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--append-system-prompt", reportSystemPrompt(nowStamp),
    ...addDirs.flatMap((d) => ["--add-dir", d]),
    "--disallowedTools", ...REPORT_DISALLOWED,
    ...(sessionId ? ["--resume", sessionId] : []),
  ];
}
