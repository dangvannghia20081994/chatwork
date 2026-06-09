"use client";

import { useEffect, useRef, useState } from "react";
import ThemeToggle from "../ThemeToggle";

export default function Chat({ initialProject }) {
  const [project, setProject] = useState(initialProject === "story" ? "story" : "rezil");
  const [messages, setMessages] = useState([]); // {role:'me'|'ai', text, status, errors:[]}
  const [input, setInput] = useState("");
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef("");
  const esRef = useRef(null);
  const logRef = useRef(null);
  const messagesRef = useRef([]);
  const isStory = project === "story";

  const storageKey = (p) => "chat:" + p;

  // keep a ref of latest messages for persistence (avoids stale closures)
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // restore saved conversation for the initial project on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(project));
      if (raw) {
        const saved = JSON.parse(raw);
        sessionRef.current = saved.session || "";
        if (Array.isArray(saved.messages)) setMessages(saved.messages);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist when a stream finishes (busy → false), skip while streaming
  useEffect(() => {
    if (busy) return;
    try {
      if (messagesRef.current.length) {
        localStorage.setItem(
          storageKey(project),
          JSON.stringify({ messages: messagesRef.current, session: sessionRef.current })
        );
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  // switch project: save outgoing conversation, then load the incoming one (per-project sessions)
  function switchProject(next) {
    if (next === project) return;
    try {
      if (messagesRef.current.length) {
        localStorage.setItem(
          storageKey(project),
          JSON.stringify({ messages: messagesRef.current, session: sessionRef.current })
        );
      }
    } catch {}
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setBusy(false);

    let loaded = null;
    try {
      const raw = localStorage.getItem(storageKey(next));
      if (raw) loaded = JSON.parse(raw);
    } catch {}
    sessionRef.current = loaded?.session || "";
    setMessages(Array.isArray(loaded?.messages) ? loaded.messages : []);
    setProject(next);
  }

  function clearChat() {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    sessionRef.current = "";
    setMessages([]);
    setBusy(false);
    try { localStorage.removeItem(storageKey(project)); } catch {}
  }

  // stop the in-flight stream but keep project + conversation; closing the
  // EventSource triggers the server stream's cancel() → SIGTERM to claude
  function stopStream() {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    patchLast((m) => (m.role === "ai" ? { ...m, status: "⏹ đã dừng" } : m));
    setBusy(false);
  }

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

  function send(e) {
    e.preventDefault();
    const q = input.trim();
    if (!q || busy) return;
    setMessages((prev) => [
      ...prev,
      { role: "me", text: q },
      { role: "ai", text: "", status: "…", errors: [] },
    ]);
    setInput("");
    setBusy(true);

    const qs = new URLSearchParams({ msg: q, project });
    if (sessionRef.current) qs.set("session", sessionRef.current);
    if (edit) qs.set("edit", "1");
    const es = new EventSource("/api/chat?" + qs.toString());
    esRef.current = es;

    es.addEventListener("session", (ev) => { sessionRef.current = JSON.parse(ev.data); });
    es.addEventListener("delta", (ev) => {
      const t = JSON.parse(ev.data);
      patchLast((m) => ({ ...m, text: m.text + t, status: "" }));
    });
    es.addEventListener("tool", (ev) => {
      const name = JSON.parse(ev.data);
      patchLast((m) => (m.text ? m : { ...m, status: "· " + name }));
    });
    es.addEventListener("error_msg", (ev) => {
      const msg = JSON.parse(ev.data);
      patchLast((m) => ({ ...m, errors: [...(m.errors || []), msg] }));
    });
    es.addEventListener("end", () => { setBusy(false); es.close(); esRef.current = null; });
    es.onerror = () => { setBusy(false); es.close(); esRef.current = null; };
  }

  const accent = isStory ? "text-purple" : "text-blue";

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex items-center gap-2.5 border-b border-line bg-panel px-5 py-3">
        <span className={`h-2 w-2 shrink-0 rounded-full ${isStory ? "bg-purple" : "bg-blue"}`} />
        <b className={`font-bold ${accent}`}>{isStory ? "Story" : "AI"} Agent</b>
        <span
          className="flex items-center gap-1.5 max-sm:hidden"
          title={sessionRef.current ? `session ${sessionRef.current}` : "Chưa có phiên hội thoại"}
        >
          <span className="text-muted">·</span>
          <span className={`h-2 w-2 rounded-full ${busy ? `${isStory ? "bg-purple" : "bg-blue"} animate-pulse` : "bg-green"}`} />
          <small className="text-muted">{busy ? "Streaming…" : "Ready"}</small>
        </span>
        {messages.length ? (
          <small className="text-muted max-sm:hidden">· {messages.length} msg</small>
        ) : null}
        <span className="ml-auto flex items-center gap-3.5">
          <select
            value={project}
            onChange={(e) => switchProject(e.target.value)}
            aria-label="project"
            className="rounded-md border border-fieldline bg-field px-2.5 py-2 text-ink"
          >
            <option value="rezil">REZIL</option>
            <option value="story">Story</option>
          </select>
          <button
            type="button"
            onClick={clearChat}
            disabled={busy || !messages.length}
            title="Xóa hội thoại đã lưu"
            className="text-muted hover:text-ink disabled:opacity-40"
          >
            🗑 Xóa
          </button>
          <a href={isStory ? "/story" : "/auto"} className="text-blue hover:underline">⚙️ Auto</a>
          <a href="/" className="text-blue hover:underline">⌂ Home</a>
          <ThemeToggle />
        </span>
      </header>

      <div ref={logRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
        {messages.map((m, i) =>
          m.role === "me" ? (
            <div
              key={i}
              className={`max-w-[80%] self-end whitespace-pre-wrap break-words rounded-lg px-3 py-2.5 text-[13px] leading-normal text-[#cdd6f4] ${isStory ? "bg-mebubblestory" : "bg-mebubble"}`}
            >
              {m.text}
            </div>
          ) : (
            <div
              key={i}
              className="w-full self-stretch whitespace-pre-wrap break-words rounded-lg border border-line bg-panel px-3 py-2.5 text-[13px] leading-normal"
            >
              {m.status ? <div className="text-xs text-dim">{m.status}</div> : null}
              {m.text}
              {(m.errors || []).map((er, j) => (
                <div key={j} className="text-xs text-err">⚠ {er}</div>
              ))}
            </div>
          )
        )}
      </div>

      <form onSubmit={send} className="border-t border-line bg-bg px-4 py-3">
        <div
          className={`flex items-center gap-2 rounded-xl border bg-field px-2 py-1.5 transition-colors ${
            isStory ? "border-fieldline focus-within:border-purple" : "border-fieldline focus-within:border-blue"
          }`}
        >
          <label
            title="Cho phép Claude sửa file / chạy lệnh (không merge/deploy/force-push)"
            className={`flex h-8 shrink-0 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[13px] transition-colors ${
              edit
                ? isStory
                  ? "bg-purple/15 text-purple"
                  : "bg-blue/15 text-blue"
                : "text-muted hover:text-ink"
            }`}
          >
            <input
              type="checkbox"
              checked={edit}
              onChange={(e) => setEdit(e.target.checked)}
              className={`h-3.5 w-3.5 ${isStory ? "accent-purple" : "accent-blue"}`}
            />
            <span className="max-sm:hidden">✏️ Sửa code</span>
            <span className="sm:hidden">✏️</span>
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Hỏi gì đó về ${isStory ? "story" : "code / ticket"}… (gõ /usage để xem giới hạn)`}
            autoFocus
            autoComplete="off"
            className="h-8 min-w-0 flex-1 bg-transparent px-2 text-ink outline-none placeholder:text-dim"
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
              className={`ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-field transition-opacity disabled:opacity-40 ${
                isStory ? "bg-purple" : "bg-blue"
              }`}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
