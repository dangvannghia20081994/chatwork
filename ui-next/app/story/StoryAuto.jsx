"use client";

import { useState } from "react";
import AutoRunner, { LABEL, FIELD_BASE, fieldFocus } from "../_components/AutoRunner";

export default function StoryAuto() {
  const [task, setTask] = useState("");

  return (
    <AutoRunner
      accent="purple"
      icon="📖"
      sidebarTitle="Story Auto"
      sidebarSub="task → PR sang develop"
      agentTitle="Story Agent"
      agentSub="auto · task → PR develop"
      chatHref="/chat?project=story"
      endpoint="/api/story-run"
      getParams={() => ({ task })}
      cancelRepo="story"
      storageKey="story"
      hint="Claude dùng agent của story (story-master + agent layer) để implement → branch fix|feature/YYYY-MM-<desc> → PR sang develop. Repo story chạy 1 job tại một thời điểm."
    >
      <label className={LABEL}>Task (mô tả tự do)</label>
      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder={"VD: Thêm API lấy danh sách chương mới nhất theo story_id\nFix selector mục lục crawler nguồn X\nThêm nút tua nhanh 15s ở player web"}
        required
        autoFocus
        className={`${FIELD_BASE} h-40 resize-y py-2 ${fieldFocus("purple")}`}
      />
    </AutoRunner>
  );
}
