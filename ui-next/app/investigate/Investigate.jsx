"use client";

import AgentConsole from "../_components/AgentConsole";

// Console điều tra ticket (read-only). Cùng khung chat với /report & /rebase; agent đọc ticket qua
// MCP, trace code 4 repo rezil (grep + git log/blame), SELECT data QA — rồi trả nguyên nhân gốc,
// bảng đánh giá DEV/SQA và các phương án khắc phục. Xem /api/investigate + lib/investigate.js.
const EXAMPLES = [
  "REZIL-2352",
  "Điều tra REZIL-2352 — vì sao số liệu màn EQUIP-003 lệch?",
  "REZIL-2400: lỗi này do commit nào gây ra? (git log/blame)",
  "Check data ở QA xem ticket này có bản ghi hỏng không",
  "Cho mình bản dán Jira của kết luận vừa rồi",
  "Còn phương án khắc phục nào ít rủi ro hơn không?",
];

const config = {
  apiPath: "/api/investigate",
  storageKey: "investigate:console",
  accent: "blue",
  icon: "🔍",
  title: "Điều tra ticket",
  badge: "root cause · read-only",
  renderMarkdown: true,
  examples: EXAMPLES,
  emptyText:
    "Nhập REZIL-xxxx (hoặc mô tả lỗi). Claude đọc ticket + comment, trace code 4 repo rezil, soi git log/blame, SELECT data QA — rồi trả về: nguyên nhân gốc kèm bằng chứng file:line, bảng đánh giá (Nguyên nhân · DEV tự đánh giá · SQA đánh giá · Phương án khắc phục lần tới), và các phương án fix kèm rủi ro/effort. CHỈ ĐỌC: không sửa code, không tạo PR, không ghi Jira — muốn fix thật thì qua màn Auto.",
  placeholder: "Vd: REZIL-2352 · hoặc: điều tra vì sao màn EQUIP-003 sai số liệu",
  editToggle: false,
  nav: [{ href: "/auto", label: "⚙️ Auto" }, { href: "/", label: "⌂ Home" }],
};

export default function Investigate() {
  return <AgentConsole config={config} />;
}
