"use client";

import AgentConsole from "../_components/AgentConsole";

// Console chụp/gán evidence test case (Google Sheet SQA · REZIL - MOBILE). Quy trình nằm nguyên
// trong spec app/evidence/SCREEN_EVIDENCE.md — agent đọc spec lúc chạy (xem /api/evidence +
// lib/evidence.js): đối chiếu Drive trước, TC nào đã có file thì chỉ gán link; TC còn thiếu mới
// dựng pre-condition (SELECT DB 207) rồi chụp trên web mobile bằng scripts/debug.mjs, khoanh đỏ
// phần tử của TC, upload bằng rclone và ghi cột M bằng HYPERLINK.
const EXAMPLES = [
  "MOB-011: TC 507-526 — đối chiếu Drive rồi chạy batch",
  "MOB-011: liệt kê TC còn trống evidence, TC nào đã có file trên Drive",
  "MOB-011 TC 485: chụp luồng resubmit (report is_rejected = 1)",
  "MOB-011: gán link cho toàn bộ TC đã có file trên Drive mà cột M còn trống",
  "MOB-011: kiểm lại 10 ô cột M vừa ghi có mở đúng file không",
  "Tách các file đặt tên theo dải (496-497) thành từng file theo số TC",
];

const config = {
  apiPath: "/api/evidence",
  sessionsPath: "/api/sessions",
  storageKey: "evidence:console",
  accent: "blue",
  icon: "📸",
  title: "Evidence",
  badge: "SQA sheet · Drive",
  renderMarkdown: true,
  examples: EXAMPLES,
  emptyText:
    "Đưa tên tab + dải TC (vd `MOB-011 TC 507-526`). Claude làm theo spec app/evidence/SCREEN_EVIDENCE.md: đọc sheet lọc TC thiếu evidence (cột M trống, J = OK) → `rclone lsf` đối chiếu folder Drive, TC nào ĐÃ có file thì chỉ lấy link chứ không chụp lại → TC còn thiếu thì dựng pre-condition bằng SELECT ở DB 207, chụp trên web mobile (mobile.10.9.17.207.nip.io) bằng scripts/debug.mjs với viewport iPad mini, khoanh đỏ phần tử của TC → upload `rclone copyto` (trùng tên thì dừng, không ghi đè) → ghi cột M bằng HYPERLINK rồi đọc lại verify. Chỉ ghi cột M/N; không sửa code, không git/gh; DB chỉ SELECT. Thao tác làm đổi dữ liệu env (submit báo cáo…) được nêu rõ hệ quả trước khi bấm.",
  placeholder: "Vd: MOB-011 TC 507-526 — đối chiếu Drive rồi chạy batch",
  editToggle: false,
  // /api/evidence chạy cwd = ROOT (repo ai-agent) chứ không phải repo rezil, nên thư mục .jsonl của
  // nó do `console` quyết định, không phải `project` (xem ROOT_CWD_CONSOLES trong lib/sessions.js).
  // KHÔNG bật `reconnect` — route này không chạy killOnDisconnect:false.
  params: { project: "rezil", console: "evidence" },
  nav: [{ href: "/chat?project=rezil", label: "💬 Chat" }, { href: "/", label: "⌂ Home" }],
};

export default function Evidence() {
  return <AgentConsole config={config} />;
}
