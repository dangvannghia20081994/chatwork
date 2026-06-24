"use client";

import AgentConsole from "../_components/AgentConsole";

// Same multi-turn console as /chat & /release (no ✏️ edit toggle). Drives the jira-master agent
// READ-ONLY to produce Jira reports (see /api/report).
const EXAMPLES = [
  "Ticket Resolved thuộc PreUAT-MVP2-A (filter=10652)",
  "Ticket Resolved thuộc UAT-MVP2-A (filter=10695)",
  "Phân bố theo status các ticket UAT-MVP2-A (filter=10695)",
  "So sánh số ticket Resolved: PreUAT-MVP2-A vs UAT-MVP2-A",
  "Ticket quá hạn chưa Done, sắp theo duedate",
  "Ticket chưa có assignee trong sprint đang mở",
  "Top 5 người đang giữ nhiều ticket Open nhất",
  "Bug được Resolved trong tuần này, kèm người fix",
  "Ticket tạo mới trong 7 ngày qua, theo issue type",
];

const config = {
  apiPath: "/api/report",
  storageKey: "report:console",
  accent: "blue",
  icon: "📊",
  title: "Report",
  badge: "jira-master · read-only",
  renderMarkdown: true,
  examples: EXAMPLES,
  emptyText:
    "Hỏi báo cáo Jira bất kỳ (standup / sprint / velocity / quá hạn / JQL tự do…). Agent jira-master query Jira READ-ONLY và tổng hợp tiếng Việt — không sửa gì trên Jira. Đa lượt: hỏi tiếp để tinh chỉnh.",
  placeholder: "Vd: Sprint summary sprint đang mở · hoặc: ticket Resolved filter=10656",
  editToggle: false,
  nav: [{ href: "/auto", label: "⚙️ Auto" }, { href: "/", label: "⌂ Home" }],
};

export default function Report() {
  return <AgentConsole config={config} />;
}
