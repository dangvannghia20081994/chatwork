"use client";

import AgentConsole from "../_components/AgentConsole";

// Same console as /chat, minus the ✏️ Sửa code toggle. Drives the github-ops agent (see /api/release).
const EXAMPLES = [
  "Release DEV1 rezil-esms (backup base → tạo PR develop → release/env-dev1)",
  "Liệt kê PR đang mở trên rezil-esms",
  "Check CI run mới nhất của rezil-esms-mobile",
  "Tạo release tag dev1/v0.1.17 cho rezil-esms-lib",
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
    "Mô tả thao tác release — agent github-ops dùng gh CLI. Mọi action ghi (merge/release/trigger) sẽ hỏi xác nhận trước. Chỉ DEV1.",
  placeholder: "Vd: Release DEV1 rezil-esms · hoặc: check CI run mới nhất rezil-esms-mobile",
  editToggle: false,
};

export default function Release() {
  return <AgentConsole config={config} />;
}
