"use client";

import { useState } from "react";
import AgentConsole, { FIELD_BASE } from "../_components/AgentConsole";

export default function Auto({ repos, defaultRepo }) {
  const [ticket, setTicket] = useState("");
  const [repo, setRepo] = useState(defaultRepo || (repos && repos[0]) || "");

  const config = {
    mode: "job",
    apiPath: "/api/run",
    accent: "blue",
    icon: "⚙️",
    title: "Auto (Fix-Bug)",
    badge: "ticket → PR",
    storageKey: "auto:rezil",
    nav: [{ href: "/chat?project=rezil", label: "💬 Chat" }, { href: "/", label: "⌂ Home" }],
    emptyText:
      "Nhập Jira ticket + chọn repo rồi bấm Run. Claude đọc ticket (issue type + screen code) và chạy trọn workflow tới tạo PR — không merge/deploy. Mỗi repo 1 job.",
    getSubmission: () => {
      const t = ticket.trim();
      if (!/^REZIL-\d+$/.test(t) || !repo) return null;
      return { display: `⚙️ ${t} → ${repo}`, params: { ticket: t, repo }, cancelKey: repo };
    },
    composer: () => (
      <div className="flex gap-2 max-sm:flex-col">
        <input
          value={ticket}
          onChange={(e) => setTicket(e.target.value)}
          placeholder="REZIL-2352"
          pattern="REZIL-\d+"
          title="REZIL-<số>"
          required
          autoFocus
          className={`${FIELD_BASE} h-10 flex-1 focus:border-blue`}
        />
        <select
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          aria-label="repo"
          className={`${FIELD_BASE} h-10 sm:w-48 focus:border-blue`}
        >
          {(repos || []).map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
    ),
  };

  return <AgentConsole config={config} />;
}
