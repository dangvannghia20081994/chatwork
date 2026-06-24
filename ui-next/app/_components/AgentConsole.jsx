"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ThemeToggle from "../ThemeToggle";

// Markdown rendering for agent answers that emit GFM (tables, lists, links) — opt-in per console
// via config.renderMarkdown (used by /report). Tables get a horizontal-scroll wrapper; links open
// in a new tab so Jira ticket links are clickable. See `.md` styles in globals.css.
const MD_COMPONENTS = {
  table: ({ node, ...props }) => <div className="md-tablewrap"><table {...props} /></div>,
  a: ({ node, ...props }) => <a target="_blank" rel="noreferrer" {...props} />,
};
function Markdown({ text }) {
  return (
    <div className="md break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{text}</ReactMarkdown>
    </div>
  );
}

// Shared multi-turn console for every agent UI. Two modes via config.mode:
//   - "chat" (default): free text input (+ optional ✏️ Sửa code toggle), session resume — /chat, /release.
//   - "job": page supplies a composer (ticket/repo/task fields) + getSubmission(); one-shot run with
//     result/NEED-INFO handling + per-repo cancel — /auto, /feature, /story.
// Streaming, message list, status, persistence and the header are shared across both.

// basePath when served behind the reverse proxy (e.g. "/ai"). Next prefixes Link/assets/API routes
// automatically, but NOT raw fetch()/EventSource — so we prefix those manually. Baked at build.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

const ACCENT = {
  blue: {
    dot: "bg-blue", text: "text-blue", focus: "focus-within:border-blue", btn: "bg-blue",
    me: "bg-mebubble", check: "accent-blue", hover: "hover:border-blue/60", chip: "bg-blue/15 text-blue",
  },
  purple: {
    dot: "bg-purple", text: "text-purple", focus: "focus-within:border-purple", btn: "bg-purple",
    me: "bg-mebubblestory", check: "accent-purple", hover: "hover:border-purple/60", chip: "bg-purple/15 text-purple",
  },
  green: {
    dot: "bg-green", text: "text-green", focus: "focus-within:border-green", btn: "bg-green",
    me: "bg-mebubble", check: "accent-green", hover: "hover:border-green/60", chip: "bg-green/15 text-green",
  },
};

// Field styles for job composers, so every page's inputs look identical.
export const LABEL = "mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted";
export const FIELD_BASE = "w-full rounded-lg border border-fieldline bg-field px-3 text-ink outline-none transition-colors";

export default function AgentConsole({ config }) {
  const isJob = config.mode === "job";
  const a = ACCENT[config.accent] || ACCENT.blue;
  const [messages, setMessages] = useState([]); // {role:'me'|'ai', text, status, errors:[]}
  const [input, setInput] = useState("");
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [suggests, setSuggests] = useState([]); // follow-up chips for the latest answer (chat-mode)
  const sessionRef = useRef("");
  const esRef = useRef(null);
  const logRef = useRef(null);
  const messagesRef = useRef([]);
  const needInfoRef = useRef(false);
  const accRef = useRef("");
  const cancelKeyRef = useRef("");

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // restore saved conversation on mount / when the storage key changes (e.g. project or repo switch)
  useEffect(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setBusy(false);
    let saved = null;
    try {
      const raw = localStorage.getItem(config.storageKey);
      if (raw) saved = JSON.parse(raw);
    } catch {}
    sessionRef.current = saved?.session || "";
    setMessages(Array.isArray(saved?.messages) ? saved.messages : []);
    setSuggests([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.storageKey]);

  // persist when a stream finishes
  useEffect(() => {
    if (busy) return;
    try {
      if (messagesRef.current.length) {
        localStorage.setItem(
          config.storageKey,
          JSON.stringify({ messages: messagesRef.current, session: sessionRef.current })
        );
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  function patchLast(fn) {
    setMessages((prev) => {
      if (!prev.length) return prev;
      const next = prev.slice();
      next[next.length - 1] = fn(next[next.length - 1]);
      return next;
    });
  }

  function clearChat() {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    sessionRef.current = "";
    setMessages([]);
    setSuggests([]);
    setBusy(false);
    try { localStorage.removeItem(config.storageKey); } catch {}
  }

  function stopStream() {
    if (cancelKeyRef.current) {
      fetch(BASE + "/api/cancel?repo=" + encodeURIComponent(cancelKeyRef.current), { method: "POST" }).catch(() => {});
    }
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    patchLast((m) => (m.role === "ai" ? { ...m, status: "⏹ đã dừng" } : m));
    setBusy(false);
  }

  function watchNeedInfo(t) {
    if (needInfoRef.current) return;
    accRef.current += t;
    if (accRef.current.includes("NEED-INFO")) {
      needInfoRef.current = true;
      patchLast((m) => ({ ...m, status: "⛔ Thiếu thông tin — bấm Dừng" }));
    }
  }

  // Open the stream for one turn/run. `url` is the full /api path with query string.
  function start(display, url, cancelKey) {
    needInfoRef.current = false;
    accRef.current = "";
    cancelKeyRef.current = cancelKey || "";
    setSuggests([]);
    setMessages((prev) => [
      ...prev,
      { role: "me", text: display },
      { role: "ai", text: "", status: "…", errors: [] },
    ]);
    setBusy(true);

    const es = new EventSource(BASE + url);
    esRef.current = es;

    es.addEventListener("session", (ev) => { sessionRef.current = JSON.parse(ev.data); });
    es.addEventListener("delta", (ev) => {
      const t = JSON.parse(ev.data);
      patchLast((m) => ({ ...m, text: m.text + t, status: "" }));
      watchNeedInfo(t);
    });
    es.addEventListener("tool", (ev) => {
      const name = JSON.parse(ev.data);
      // Always reflect the latest tool/agent activity — the next delta clears it. Without this,
      // a long sub-agent run after the model has already written text shows no progress at all.
      patchLast((m) => ({ ...m, status: "· " + name }));
    });
    es.addEventListener("result", (ev) => {
      const r = JSON.parse(ev.data);
      if (needInfoRef.current) return;
      const err = r.isError || (r.exitCode !== undefined && r.exitCode !== 0);
      if (err) patchLast((m) => ({ ...m, status: "✗ lỗi" }));
    });
    es.addEventListener("error_msg", (ev) => {
      const msg = JSON.parse(ev.data);
      patchLast((m) => ({ ...m, errors: [...(m.errors || []), msg] }));
    });
    es.addEventListener("suggest", (ev) => {
      try { const arr = JSON.parse(ev.data); if (Array.isArray(arr)) setSuggests(arr); } catch {}
    });
    es.addEventListener("end", () => { setBusy(false); es.close(); esRef.current = null; });
    es.onerror = () => { setBusy(false); if (esRef.current) { esRef.current.close(); esRef.current = null; } };
  }

  function submitChat(text) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const qs = new URLSearchParams({ msg: q, ...(config.params || {}) });
    if (sessionRef.current) qs.set("session", sessionRef.current);
    if (config.editToggle && edit) qs.set("edit", "1");
    setInput("");
    start(q, config.apiPath + "?" + qs.toString(), "");
  }

  function submitJob() {
    if (busy) return;
    const sub = config.getSubmission?.();
    if (!sub) return;
    const qs = new URLSearchParams(sub.params);
    start(sub.display, config.apiPath + "?" + qs.toString(), sub.cancelKey || "");
  }

  function send(e) {
    e.preventDefault();
    if (isJob) submitJob();
    else submitChat();
  }

  const nav = config.nav || [{ href: "/auto", label: "⚙️ Auto" }, { href: "/", label: "⌂ Home" }];

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex items-center gap-2.5 border-b border-line bg-panel px-5 py-3">
        <span className={`h-2 w-2 shrink-0 rounded-full ${a.dot}`} />
        <b className={`font-bold ${a.text}`}>{config.icon} {config.title}</b>
        <span className="flex items-center gap-1.5 max-sm:hidden" title={config.badge}>
          {config.badge ? (
            <>
              <span className="text-muted">·</span>
              <small className="text-muted">{config.badge}</small>
            </>
          ) : null}
          <span className="text-muted">·</span>
          <span className={`h-2 w-2 rounded-full ${busy ? `${a.dot} animate-pulse` : "bg-green"}`} />
          <small className="text-muted">{busy ? "Streaming…" : "Ready"}</small>
        </span>
        {messages.length ? (
          <small className="text-muted max-sm:hidden">· {messages.length} msg</small>
        ) : null}
        <span className="ml-auto flex items-center gap-3.5">
          <button
            type="button"
            onClick={clearChat}
            disabled={busy || !messages.length}
            title="Xóa hội thoại đã lưu"
            className="text-muted hover:text-ink disabled:opacity-40"
          >
            🗑 Xóa
          </button>
          {nav.map((n) => (
            <a key={n.href} href={BASE + n.href} className="text-blue hover:underline">{n.label}</a>
          ))}
          <ThemeToggle />
        </span>
      </header>

      <div ref={logRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
        {messages.length === 0 ? (
          <div className="m-auto flex max-w-md flex-col items-center gap-4 text-center">
            <div className="text-4xl">{config.icon}</div>
            <p className="text-sm text-muted">{config.emptyText}</p>
            {!isJob && (config.examples || []).length ? (
              <div className="flex flex-col gap-2 self-stretch">
                {config.examples.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => submitChat(ex)}
                    className={`rounded-lg border border-line bg-panel px-3 py-2 text-left text-[13px] text-muted transition-colors hover:text-ink ${a.hover}`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === "me" ? (
              <div
                key={i}
                className={`max-w-[80%] self-end whitespace-pre-wrap break-words rounded-lg px-3 py-2.5 text-[13px] leading-normal text-[#cdd6f4] ${a.me}`}
              >
                {m.text}
              </div>
            ) : (
              <div
                key={i}
                className={`w-full self-stretch break-words rounded-lg border border-line bg-panel px-3 py-2.5 text-[13px] leading-normal ${config.renderMarkdown ? "" : "whitespace-pre-wrap"}`}
              >
                {m.status ? <div className="text-xs text-dim">{m.status}</div> : null}
                {config.renderMarkdown ? (m.text ? <Markdown text={m.text} /> : null) : m.text}
                {(m.errors || []).map((er, j) => (
                  <div key={j} className="text-xs text-err">⚠ {er}</div>
                ))}
              </div>
            )
          )
        )}
      </div>

      {!isJob && suggests.length > 0 && !busy ? (
        <div className="flex flex-wrap gap-2 border-t border-line bg-bg px-4 pt-3">
          {suggests.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => submitChat(s)}
              className={`rounded-full border border-line bg-panel px-3 py-1.5 text-left text-[12px] text-muted transition-colors hover:text-ink ${a.hover}`}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={send} className="border-t border-line bg-bg px-4 py-3">
        {isJob ? (
          <div className="flex flex-col gap-2">
            {typeof config.composer === "function" ? config.composer({ busy, a }) : config.composer}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-lg font-semibold text-field transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${a.btn}`}
              >
                {busy ? "Đang chạy…" : "▶ Run"}
              </button>
              <button
                type="button"
                onClick={stopStream}
                disabled={!busy}
                className="h-10 rounded-lg border border-fieldline px-4 text-ink transition-colors hover:border-err hover:text-err disabled:cursor-not-allowed disabled:opacity-40"
              >
                Dừng
              </button>
            </div>
          </div>
        ) : (
          <div className={`flex items-center gap-2 rounded-xl border border-fieldline bg-field px-2 py-1.5 transition-colors ${a.focus}`}>
            {config.editToggle ? (
              <label
                title="Cho phép Claude sửa file / chạy lệnh (không merge/deploy/force-push)"
                className={`flex h-8 shrink-0 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[13px] transition-colors ${
                  edit ? a.chip : "text-muted hover:text-ink"
                }`}
              >
                <input
                  type="checkbox"
                  checked={edit}
                  onChange={(e) => setEdit(e.target.checked)}
                  disabled={busy}
                  className={`h-3.5 w-3.5 ${a.check} disabled:cursor-not-allowed disabled:opacity-50`}
                />
                <span className="max-sm:hidden">✏️ Sửa code</span>
                <span className="sm:hidden">✏️</span>
              </label>
            ) : null}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={busy ? "Đang chạy… nhấn ⏹ để dừng" : config.placeholder}
              disabled={busy}
              autoFocus
              autoComplete="off"
              className="h-8 min-w-0 flex-1 bg-transparent px-2 text-ink outline-none placeholder:text-dim disabled:cursor-not-allowed disabled:opacity-60"
            />
            {busy ? (
              <button
                type="button"
                onClick={stopStream}
                aria-label="Dừng"
                title="Dừng"
                className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-err text-field transition-opacity hover:opacity-90"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Gửi"
                title="Gửi"
                className={`ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-field transition-opacity disabled:opacity-40 ${a.btn}`}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5" />
                  <path d="M5 12l7-7 7 7" />
                </svg>
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
