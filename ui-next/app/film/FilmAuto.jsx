"use client";

import { useState } from "react";
import AgentConsole, { FIELD_BASE } from "../_components/AgentConsole";

export default function FilmAuto() {
  const [task, setTask] = useState("");

  const config = {
    mode: "job",
    apiPath: "/api/film-run",
    accent: "green",
    icon: "🎬",
    title: "Film Auto",
    badge: "task → PR develop",
    storageKey: "auto:film",
    nav: [{ href: "/chat?project=film", label: "💬 Chat" }, { href: "/", label: "⌂ Home" }],
    emptyText:
      "Mô tả task tự do rồi Run. Claude implement trong repo ai-film-studio → branch fix|feature/YYYY-MM-<desc> → PR sang develop. Repo chạy 1 job tại một thời điểm.",
    getSubmission: () => {
      const t = task.trim();
      if (!t) return null;
      return { display: t, params: { task: t }, cancelKey: "film" };
    },
    composer: () => (
      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder={"VD: Thêm trang quản lý scene trong /admin\nFix retry khi Job lỗi oom ở film-worker\nThêm validate Zod cho workflow JSON trước khi gửi ComfyUI"}
        required
        autoFocus
        className={`${FIELD_BASE} h-28 resize-y py-2 focus:border-green`}
      />
    ),
  };

  return <AgentConsole config={config} />;
}
