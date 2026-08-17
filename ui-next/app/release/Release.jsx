"use client";

import AgentConsole from "../_components/AgentConsole";

// Same console as /chat, minus the ✏️ Sửa code toggle. Drives the github-ops agent (see /api/release).
const EXAMPLES = [
  "Chỉ lấy các ticket JIRA có status=Resolved thuộc filter=10777 (MVP2-B)",
  "Chỉ lấy ticket Resolved + label dev1-ready thuộc filter=10777 (MVP2-B)",
  "Release DEV1 các ticket REZIL-2673 REZIL-2663 (lib + admin + mobile)",
  "Release STG các ticket REZIL-2673 REZIL-2663 (tag stg/v*, confirm trước khi push)",
  "Tạo tab deploy dd/mm trên sheet Deployment + điền ticket của đợt STG vừa release",
  "Liệt kê commit in-scope chưa release của REZIL-2660 (chỉ xem, chưa làm gì)",
  "Tag dev1/v0.2.1 cho rezil-esms-lib từ nhánh release dev1 mới nhất",
  "Check CI run mới nhất của rezil-esms-lib",
];

const config = {
  apiPath: "/api/release",
  storageKey: "release:console",
  accent: "purple",
  icon: "🚀",
  title: "Release",
  badge: "github-ops",
  examples: EXAMPLES,
  emptyText:
    "Release DEV1/STG (subset cherry-pick → push tag): nêu danh sách ticket. Agent github-ops dùng git/gh, làm lib trước → admin/mobile. Mọi action ghi (push nhánh/tag, merge, trigger) hỏi xác nhận trước; STG bắt buộc confirm. Xong STG: update Jira + bump version develop + tạo tab deploy dd/mm trên sheet Deployment. Cấm PRODUCTION.",
  placeholder: "Vd: Release DEV1 REZIL-2673 REZIL-2663 · hoặc: check CI run mới nhất rezil-esms-lib",
  editToggle: false,
};

export default function Release() {
  return <AgentConsole config={config} />;
}
