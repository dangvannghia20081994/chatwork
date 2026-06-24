"use client";

import { useState } from "react";
import AgentConsole, { FIELD_BASE } from "../_components/AgentConsole";

// Repo is no longer chosen here — Claude reads the ticket and derives the target repo itself.
export default function Auto() {
  const [ticket, setTicket] = useState("");

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
      "Nhập Jira ticket rồi bấm Run. Claude đọc ticket (issue type + screen code + repo) và chạy trọn workflow tới tạo PR — không merge/deploy. Mỗi ticket 1 job.",
    getSubmission: () => {
      const t = ticket.trim();
      if (!/^REZIL-\d+$/.test(t)) return null;
      return { display: `⚙️ ${t}`, params: { ticket: t }, cancelKey: t };
    },
    composer: () => (
      <input
        value={ticket}
        onChange={(e) => setTicket(e.target.value)}
        placeholder="REZIL-2352"
        pattern="REZIL-\d+"
        title="REZIL-<số>"
        required
        autoFocus
        className={`${FIELD_BASE} h-10 w-full focus:border-blue`}
      />
    ),
  };

  return <AgentConsole config={config} />;
}
