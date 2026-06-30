// Report console: drive the `jira-master` agent (Atlassian MCP) to produce READ-ONLY Jira reports
// — standup, sprint summary, velocity, status breakdown, overdue, ad-hoc JQL. Multi-turn (resume)
// like /chat & /release, so the user can refine ("nhóm theo epic", "thêm story point") across turns.
//
// Mirrors /release's shape (claude -p --agent ... + claudeSSE pump), but the agent is the Jira
// teamlead and EVERY write path is hard-disabled so a "report" can never mutate Jira.
import { loadConfig } from "./config.js";

export const REPORT_AGENT = "jira-master";

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

// Console-specific config only — Jira search/report know-how lives in the jira-master agent
// (~/.claude/agents/jira-master.md), loaded via --agent. We inject the current date (the agent must
// not self-generate one) + read-only console-mode rules here.
export function reportSystemPrompt(nowStamp) {
  const jira = loadConfig("jira");
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
    "- Báo cáo dạng đếm/tổng hợp: lấy con số `total` từ kết quả thay vì kéo toàn bộ issue; chỉ liệt kê chi tiết khi cần và giới hạn ~20-30 dòng.",
    "- Cần đếm theo nhiều status → chạy vài JQL đếm riêng (mỗi cái lấy total), KHÔNG kéo hết rồi tự đếm.",
    "- maxResults ≤ 50; nếu còn trang dùng nextPageToken — KHÔNG cố lấy tất cả trong một lần.",
    "- Nếu một kết quả tool VẪN quá lớn và bị LƯU RA FILE (đường dẫn .../tool-results/...): đọc bằng Read (offset/limit)",
    "  hoặc đếm bằng Grep — KHÔNG bỏ cuộc, KHÔNG giao agent khác.",
    "",
    "## OUTPUT (TIẾNG VIỆT, markdown)",
    "Mở đầu 1 dòng nêu phạm vi + JQL đã dùng (đặt JQL trong khối `code`). Trình bày bằng bảng/list;",
    "mỗi ticket dạng `REZIL-XXXX — summary (status, assignee)`. Kết bằng 'Nhận xét' 1-3 gạch đầu dòng.",
    "Số liệu phải KHỚP dữ liệu query, KHÔNG bịa; query rỗng → nói rõ 'không có ticket khớp'.",
    "",
    "Kết thúc MỖI lượt bằng khối gợi ý, định dạng CHÍNH XÁC: một dòng `<<<SUGGEST>>>` rồi 2–3 dòng, mỗi dòng",
    "`- <gợi ý ngắn bấm để hỏi/báo cáo tiếp>` (vd đổi phạm vi, nhóm theo epic, thêm story point). Tiếng Việt,",
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
