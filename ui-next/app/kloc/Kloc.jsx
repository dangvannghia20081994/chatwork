"use client";

import AgentConsole from "../_components/AgentConsole";

// Console thống kê KLoC: đọc PR đã merge của 4 repo rezil (gh CLI) → append vào Google Sheet
// `REZIL - KLoc`, tab KLoC-MVP2. Quy tắc nằm nguyên trong spec app/kloc/KLOC_SPEC.md — agent đọc
// spec lúc chạy (xem /api/kloc + lib/kloc.js): LoC (New) = additions, LoC (Modified) = deletions,
// Feature ID/Sprint parse từ PR title `[tag] FEATURE-ID | tên`, chống trùng theo URL PR ở cột E.
const EXAMPLES = [
  "Quét PR merge từ 25/08 đến hôm nay, in bảng kế hoạch (chưa ghi)",
  "Ghi các PR còn thiếu tính đến hôm nay vào sheet",
  "Ghi 5 PR: rezil-esms#1678, #1731, #1744, lib#848, mobile#1377 (%AI 90)",
  "Liệt kê PR đã merge nhưng chưa có dòng trên sheet, theo từng repo",
  "Đối chiếu 20 dòng cuối sheet với gh: LoC có khớp additions/deletions không",
  "Các dòng nào đang trống AI Usage (%)?",
];

const config = {
  apiPath: "/api/kloc",
  sessionsPath: "/api/sessions",
  storageKey: "kloc:console",
  accent: "blue",
  icon: "📐",
  title: "KLOC",
  badge: "PR rezil · sheet KLoC",
  renderMarkdown: true,
  examples: EXAMPLES,
  emptyText:
    "Đưa phạm vi PR (khoảng ngày, hoặc danh sách PR). Claude làm theo spec app/kloc/KLOC_SPEC.md: `gh pr list --state merged --base develop` cho cả 4 repo rezil → đọc cột E của tab KLoC-MVP2 để loại PR đã có dòng → parse title `[tag] FEATURE-ID | tên` ra Feature ID/Feature Name/Sprint, map author → PIC, LoC (New) = additions, LoC (Modified) = deletions → append một phát vào A:M rồi đọc lại verify. Lượt đầu in bảng kế hoạch; chỉ APPEND, không sửa dòng cũ, không đụng tab Overview/Summary; `gh`/`git` chỉ đọc, không sửa file repo. Cột AI Usage (%) chỉ ghi khi bạn cung cấp số.",
  placeholder: "Vd: quét PR merge từ 25/08 đến hôm nay, in bảng kế hoạch",
  editToggle: false,
  // Một lượt quét 4 repo + ghi sheet kéo dài vài phút, hay xem trên điện thoại qua ngrok → route
  // chạy killOnDisconnect:false + job-lock theo runId nên bật reconnect (giống /evidence).
  reconnect: true,
  // /api/kloc chạy cwd = ROOT (repo ai-agent) chứ không phải repo rezil → thư mục .jsonl do
  // `console` quyết định (xem ROOT_CWD_CONSOLES trong lib/sessions.js).
  params: { project: "rezil", console: "kloc" },
  nav: [{ href: "/chat?project=rezil", label: "💬 Chat" }, { href: "/", label: "⌂ Home" }],
};

export default function Kloc() {
  return <AgentConsole config={config} />;
}
