"use client";

import { useState } from "react";
import AgentConsole, { FIELD_BASE } from "../_components/AgentConsole";

export default function StoryAuto() {
  const [task, setTask] = useState("");

  const config = {
    mode: "job",
    apiPath: "/api/story-run",
    accent: "purple",
    icon: "📖",
    title: "Story Auto",
    badge: "task → PR develop",
    storageKey: "auto:story",
    nav: [{ href: "/chat?project=story", label: "💬 Chat" }, { href: "/", label: "⌂ Home" }],
    emptyText:
      "Mô tả task tự do rồi Run. Claude dùng agent của story (story-master + agent layer) → branch fix|feature/YYYY-MM-<desc> → PR sang develop. Repo story chạy 1 job tại một thời điểm.",
    getSubmission: () => {
      const t = task.trim();
      if (!t) return null;
      return { display: t, params: { task: t }, cancelKey: "story" };
    },
    composer: () => (
      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder={"VD: Thêm API lấy danh sách chương mới nhất theo story_id\nFix selector mục lục crawler nguồn X\nThêm nút tua nhanh 15s ở player web"}
        required
        autoFocus
        className={`${FIELD_BASE} h-28 resize-y py-2 focus:border-purple`}
      />
    ),
  };

  return <AgentConsole config={config} />;
}
