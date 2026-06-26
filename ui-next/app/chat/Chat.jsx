"use client";

import AgentConsole from "../_components/AgentConsole";

// Project comes from the URL (?project=). The only difference vs /release is the ✏️ Sửa code toggle.
const EXAMPLES = {
  rezil: [
    "Giải thích luồng xử lý màn ISSUE-001 (BE → FE)",
    "Tìm chỗ xử lý upload CSV trong be-api",
    "REZIL-xxxx nói về gì?",
    "/usage — xem giới hạn token",
  ],
  story: [
    "Cấu trúc repo story gồm những layer nào?",
    "Tìm worker xử lý ảnh truyện",
    "Giải thích flow đọc truyện ở Next.js app",
    "/usage — xem giới hạn token",
  ],
};

export default function Chat({ initialProject }) {
  const project = initialProject === "story" ? "story" : "rezil";
  const isStory = project === "story";

  const config = {
    apiPath: "/api/chat",
    uploadPath: "/api/chat/upload",
    storageKey: "chat:" + project,
    accent: isStory ? "purple" : "blue",
    icon: "💬",
    title: "Chat",
    badge: isStory ? "Story" : "REZIL",
    examples: EXAMPLES[project],
    emptyText: isStory
      ? "Hỏi/sửa repo story — Read/Grep code, query postgres, web. Bật ✏️ để cho sửa file."
      : "Hỏi/sửa code REZIL hoặc tra Jira. Read-only mặc định; bật ✏️ để cho sửa file + chạy build/test.",
    placeholder: `Hỏi gì đó về ${isStory ? "story" : "code / ticket"}… (gõ /usage để xem giới hạn)`,
    editToggle: true,
    params: { project },
  };

  return <AgentConsole config={config} />;
}
