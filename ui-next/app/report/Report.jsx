"use client";

import AgentConsole from "../_components/AgentConsole";

// Multi-turn chat console (like /chat & /release). The report agent turns each free-form request into
// a JQL, fetches Jira via the LOCAL REST CLI (scripts/jira-search.mjs — not MCP), then analyses the
// compact JSON. READ-ONLY. See /api/report + lib/report.js.
const EXAMPLES = [
  "Report UAT-MVP2-A hôm nay",
  "Report PreUAT-MVP2-A",
  "Ticket Resolved thuộc UAT-MVP2-A, nhóm theo người",
  "Bug đang mở của REZIL, nhóm theo assignee",
  "Ticket chưa có assignee trong filter=10695",
  "Top 5 người giữ nhiều ticket 'còn' nhất ở UAT-MVP2-A",
  "Ticket tạo trong 7 ngày qua, theo issue type",
];

const config = {
  apiPath: "/api/report",
  storageKey: "report:console",
  accent: "blue",
  icon: "📊",
  title: "Report",
  badge: "Jira REST · read-only",
  renderMarkdown: true,
  examples: EXAMPLES,
  emptyText:
    "Gõ yêu cầu báo cáo tự do bằng tiếng Việt. Claude tự dựng JQL, lấy data qua REST API (không dùng MCP) rồi phân tích/thống kê — không sửa gì trên Jira. Đa lượt: hỏi tiếp để tinh chỉnh (đổi env, nhóm theo epic, xem chi tiết…).",
  placeholder: "Vd: Report UAT-MVP2-A hôm nay · hoặc: bug đang mở nhóm theo người",
  editToggle: false,
  nav: [{ href: "/", label: "⌂ Home" }],
};

export default function Report() {
  return <AgentConsole config={config} />;
}
