"use client";

import { useState } from "react";
import AutoRunner, { LABEL, FIELD_BASE, fieldFocus } from "../_components/AutoRunner";

export default function Auto({ repos, defaultRepo }) {
  const [ticket, setTicket] = useState("");
  const [repo, setRepo] = useState(defaultRepo || (repos && repos[0]) || "");

  return (
    <AutoRunner
      accent="blue"
      icon="⚙️"
      sidebarTitle="REZIL Auto"
      sidebarSub="ticket → implement → PR"
      agentTitle="AI Agent"
      agentSub="auto · ticket → PR · no merge/deploy"
      chatHref="/chat?project=rezil"
      endpoint="/api/run"
      getParams={() => ({ ticket, repo })}
      cancelRepo={repo}
      storageKey="rezil"
      hint="Claude tự đọc ticket để lấy issue type + screen code, rồi chạy trọn workflow tới tạo PR. Mỗi repo chạy 1 job; mở tab repo khác để chạy song song."
    >
      <label className={LABEL}>Jira ticket</label>
      <input
        value={ticket}
        onChange={(e) => setTicket(e.target.value)}
        placeholder="REZIL-2352"
        pattern="REZIL-\d+"
        title="REZIL-<số>"
        required
        autoFocus
        className={`${FIELD_BASE} h-10 ${fieldFocus("blue")}`}
      />
      <label className={`${LABEL} mt-4`}>Repo</label>
      <select
        value={repo}
        onChange={(e) => setRepo(e.target.value)}
        className={`${FIELD_BASE} h-10 ${fieldFocus("blue")}`}
      >
        {(repos || []).map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
    </AutoRunner>
  );
}
