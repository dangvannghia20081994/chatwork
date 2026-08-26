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
  // Unrestricted, all-projects mode: cwd = ~/IdeaProjects, no tool filters, bypassPermissions.
  // Always full-capability → no ✏️ toggle (see editToggle below).
  free: {
    accent: "blue",
    badge: "Toàn năng · mọi project",
    emptyText: "Mode toàn năng: thao tác MỌI project trong ~/IdeaProjects, không giới hạn tool (đọc/sửa/Bash/git/Agent/MCP). Không có rào chắn — cẩn thận với lệnh phá huỷ.",
    placeholder: "Yêu cầu gì cũng được, trên project nào cũng được… (gõ /usage để xem giới hạn)",
    examples: [
      "Liệt kê các project trong ~/IdeaProjects",
      "So sánh cách xử lý auth giữa rezil-esms và story",
      "Chạy git status ở tất cả repo và tóm tắt",
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
    sessionsPath: "/api/sessions",
    storageKey: "chat:" + project,
    accent: p.accent,
    icon: project === "free" ? "🛸" : "💬",
    title: project === "free" ? "Toàn năng" : "Chat",
    badge: p.badge,
    examples: p.examples,
    emptyText: p.emptyText,
    placeholder: p.placeholder,
    editToggle: project !== "free", // free mode is always fully capable → toggle is meaningless
    // reconnect: chỉ /api/chat chạy killOnDisconnect:false + đăng ký runId, nên chỉ màn này khôi
    // phục được run sau khi rớt socket (xem AgentConsole).
    reconnect: true,
    params: { project, console: "chat" },
  };

  return <AgentConsole config={config} />;
}
