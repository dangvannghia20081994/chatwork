"use client";

import { useState } from "react";
import AgentConsole, { FIELD_BASE } from "../_components/AgentConsole";

export default function Feature({ repos, defaultRepo }) {
  const [ticket, setTicket] = useState("");
  const [repo, setRepo] = useState(defaultRepo || (repos && repos[0]) || "");
  const [context, setContext] = useState("");

  const config = {
    mode: "job",
    apiPath: "/api/feature-run",
    accent: "green",
    icon: "🏗️",
    title: "Feature",
    badge: "BD+Figma → PR",
    storageKey: "auto:feature",
    nav: [{ href: "/chat?project=rezil", label: "💬 Chat" }, { href: "/", label: "⌂ Home" }],
    emptyText:
      "Nhập ticket + repo chính + dán BD/Figma (text, link, hoặc path file BD), rồi Run. Chạy trọn 16 phase (design-first → testcase-first → OpenAPI/Aspida → LIB/BE/FE → test → PR). Job dài (vài chục phút).",
    getSubmission: () => {
      const t = ticket.trim();
      if (!/^REZIL-\d+$/.test(t) || !repo) return null;
      return {
        display: `🏗️ ${t} → ${repo}${context.trim() ? " (+ BD/Figma)" : ""}`,
        params: { ticket: t, repo, context },
        cancelKey: repo,
      };
    },
    composer: () => (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 max-sm:flex-col">
          <input
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            placeholder="REZIL-2352"
            pattern="REZIL-\d+"
            title="REZIL-<số>"
            required
            autoFocus
            className={`${FIELD_BASE} h-10 flex-1 focus:border-green`}
          />
          <select
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            aria-label="repo chính"
            className={`${FIELD_BASE} h-10 sm:w-48 focus:border-green`}
          >
            {(repos || []).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder={"BD + Figma (tuỳ chọn): dán nội dung BD, hoặc:\n- BD: docs/bd/equipment-filter.md\n- Figma: https://figma.com/file/...\nĐể trống nếu BD/Figma đã có trong remote links của ticket."}
          className={`${FIELD_BASE} h-28 resize-y py-2 focus:border-green`}
        />
      </div>
    ),
  };

  return <AgentConsole config={config} />;
}
