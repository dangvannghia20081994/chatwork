"use client";

import AgentConsole from "../_components/AgentConsole";

// Per-project chat console settings. Project comes from the URL (?project=). The only difference
// vs /release is the ✏️ Sửa code toggle. Adding a project = one entry here.
const PROJECTS = {
  rezil: {
    accent: "blue",
    badge: "REZIL",
    emptyText: "Hỏi/sửa code REZIL hoặc tra Jira. Read-only mặc định; bật ✏️ để cho sửa file + chạy build/test.",
    placeholder: "Hỏi gì đó về code / ticket… (gõ /usage để xem giới hạn)",
    examples: [
      "Giải thích luồng xử lý màn ISSUE-001 (BE → FE)",
      "Tìm chỗ xử lý upload CSV trong be-api",
      "REZIL-xxxx nói về gì?",
      "/usage",
    ],
  },
  story: {
    accent: "purple",
    badge: "Story",
    emptyText: "Hỏi/sửa repo story — Read/Grep code, query postgres, web. Bật ✏️ để cho sửa file.",
    placeholder: "Hỏi gì đó về story… (gõ /usage để xem giới hạn)",
    examples: [
      "Cấu trúc repo story gồm những layer nào?",
      "Tìm worker xử lý ảnh truyện",
      "Giải thích flow đọc truyện ở Next.js app",
      "/usage",
    ],
  },
  film: {
    accent: "green",
    badge: "AI Film Studio",
    emptyText: "Hỏi/sửa repo ai-film-studio — Read/Grep code, web. Bật ✏️ để cho sửa file + chạy build/test.",
    placeholder: "Hỏi gì đó về ai-film-studio… (gõ /usage để xem giới hạn)",
    examples: [
      "Cấu trúc repo ai-film-studio gồm những layer nào?",
      "Flow tạo Job render rồi worker xử lý chạy thế nào?",
      "lib/engine.ts chọn endpoint ComfyUI ra sao?",
      "/usage",
    ],
  },
};

export default function Chat({ initialProject }) {
  const project = PROJECTS[initialProject] ? initialProject : "rezil";
  const p = PROJECTS[project];

  const config = {
    apiPath: "/api/chat",
    uploadPath: "/api/chat/upload",
    storageKey: "chat:" + project,
    accent: p.accent,
    icon: "💬",
    title: "Chat",
    badge: p.badge,
    examples: p.examples,
    emptyText: p.emptyText,
    placeholder: p.placeholder,
    editToggle: true,
    params: { project },
  };

  return <AgentConsole config={config} />;
}
