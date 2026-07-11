"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ThemeToggle from "../ThemeToggle";
import BackToTop from "./BackToTop";
import { playDoneSound, playErrorSound } from "../../lib/notifySound";

// Markdown rendering for agent answers that emit GFM (tables, lists, links) — ON by default for
// every console; a console can opt OUT with config.renderMarkdown: false. Tables get a
// horizontal-scroll wrapper; links open in a new tab so Jira ticket links are clickable.
// See `.md` styles in globals.css.
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

// Help text for the client-side slash commands (shown by /help). Plain text — chat consoles render
// answers as pre-wrapped text unless config.renderMarkdown.
const SLASH_HELP =
  "Lệnh nhanh:\n" +
  "  /usage, /cost  — xem giới hạn token (phiên 5h + tuần)\n" +
  "  /context       — token context phiên hiện tại đang chiếm\n" +
  "  /clear, /new   — xoá hội thoại, bắt đầu phiên mới\n" +
  "  /help          — hiện danh sách lệnh này";

const ACCENT = {
  blue: {
    dot: "bg-blue", text: "text-blue", focus: "focus-within:border-blue", btn: "bg-blue",
    me: "bg-mebubble", check: "accent-blue", hover: "hover:border-blue/60", chip: "bg-blue/15 text-blue", ring: "border-blue",
  },
  purple: {
    dot: "bg-purple", text: "text-purple", focus: "focus-within:border-purple", btn: "bg-purple",
    me: "bg-mebubblestory", check: "accent-purple", hover: "hover:border-purple/60", chip: "bg-purple/15 text-purple", ring: "border-purple",
  },
  green: {
    dot: "bg-green", text: "text-green", focus: "focus-within:border-green", btn: "bg-green",
    me: "bg-mebubble", check: "accent-green", hover: "hover:border-green/60", chip: "bg-green/15 text-green", ring: "border-green",
  },
};

// Thời gian tương đối gọn cho danh sách phiên (vd "5 phút trước", "3 ngày trước").
function relTime(ms) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return new Date(ms).toLocaleDateString("vi-VN");
}

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
  const [attachments, setAttachments] = useState([]); // uploaded images {name, path} for next turn
  const [uploading, setUploading] = useState(false);
  // Panel "Phiên đã lưu" (chat-mode, khi config.sessionsPath có): liệt kê + mở lại phiên .jsonl cũ.
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  // Job-mode resume (config.resumable): after a ⛔ NEED-INFO stop, show an answer box and --resume
  // the same session instead of re-running the ticket from scratch.
  const [needInfoActive, setNeedInfoActive] = useState(false);
  const [answer, setAnswer] = useState("");
  const lastJobRef = useRef(null); // last submitted job {display, params, cancelKey} — reused on resume
  const sessionRef = useRef("");
  const esRef = useRef(null);
  const fileInputRef = useRef(null);
  const logRef = useRef(null);
  const messagesRef = useRef([]);
  const needInfoRef = useRef(false);
  const accRef = useRef("");
  const cancelKeyRef = useRef("");
  // Completion-sound bookkeeping per turn: error seen? user-aborted? already chimed?
  const sawErrorRef = useRef(false);
  const abortedRef = useRef(false);
  const soundedRef = useRef(false);

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

  // Reset chỉ phía client: đóng stream, quên session, xoá localStorage + state hiển thị.
  function resetLocal() {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    sessionRef.current = "";
    lastJobRef.current = null;
    setMessages([]);
    setSuggests([]);
    setNeedInfoActive(false);
    setAnswer("");
    setBusy(false);
    try { localStorage.removeItem(config.storageKey); } catch {}
  }

  // "Xóa hội thoại": reset local, và khi console có sessionsPath thì XOÁ LUÔN file phiên phía server
  // (trước đây chỉ xoá localStorage nên phiên vẫn còn trong "Phiên đã lưu"). deleteServer=false = chỉ
  // bắt đầu phiên mới, GIỮ phiên cũ (dùng cho "＋ Phiên mới" / lệnh /new).
  function clearChat(deleteServer = false) {
    const id = sessionRef.current;
    resetLocal();
    if (deleteServer && id && config.sessionsPath) {
      fetch(BASE + config.sessionsPath + "/" + id + "?" + sessionsQuery(), { method: "DELETE" }).catch(() => {});
    }
  }

  // ── Phiên đã lưu (config.sessionsPath) ─────────────────────────────────────
  // API cần biết project để đọc đúng thư mục .jsonl (mỗi project có cwd riêng).
  function sessionsQuery() {
    return new URLSearchParams(config.params || {}).toString();
  }

  async function openSessions() {
    if (!config.sessionsPath) return;
    setShowSessions(true);
    setLoadingSessions(true);
    try {
      const res = await fetch(BASE + config.sessionsPath + "?" + sessionsQuery());
      const data = await res.json().catch(() => ({}));
      setSessions(res.ok ? data.sessions || [] : []);
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }

  // Mở lại 1 phiên cũ: dựng lại hội thoại + set session_id để lượt sau --resume nối tiếp context.
  async function loadSession(id) {
    if (!config.sessionsPath || busy) return;
    setShowSessions(false);
    try {
      const res = await fetch(BASE + config.sessionsPath + "/" + id + "?" + sessionsQuery());
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "ai", text: "", status: "✗ không tải được phiên", errors: [data.error || ""] }]);
        return;
      }
      const msgs = Array.isArray(data.messages) ? data.messages : [];
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      sessionRef.current = id;
      setMessages(msgs);
      setSuggests([]);
      try { localStorage.setItem(config.storageKey, JSON.stringify({ messages: msgs, session: id })); } catch {}
    } catch {
      /* mạng lỗi — bỏ qua, người dùng bấm lại */
    }
  }

  async function deleteSession(id, e) {
    e?.stopPropagation();
    if (!config.sessionsPath) return;
    if (!confirm("Xoá vĩnh viễn phiên này? Không thể hoàn tác.")) return;
    try {
      const res = await fetch(BASE + config.sessionsPath + "/" + id + "?" + sessionsQuery(), { method: "DELETE" });
      if (!res.ok) return;
      setSessions((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
      if (sessionRef.current === id) resetLocal(); // đã xoá file server ở trên → chỉ cần reset local
    } catch {
      /* bỏ qua */
    }
  }

  // Client-side slash commands — handled in the browser, no server round-trip / no claude spawn.
  // (/usage and /cost are server-side — see lib/slashCommands.js — so they fall through to the API.)
  function handleClientSlash(typed) {
    const cmd = typed.toLowerCase();
    if (cmd === "/clear") { clearChat(true); return true; }  // xoá hẳn phiên hiện tại
    if (cmd === "/new") { clearChat(false); return true; }   // giữ phiên cũ, bắt đầu phiên mới
    if (cmd === "/help") {
      setMessages((prev) => [
        ...prev,
        { role: "me", text: typed },
        { role: "ai", text: SLASH_HELP, status: "", errors: [] },
      ]);
      return true;
    }
    return false;
  }

  function stopStream() {
    if (cancelKeyRef.current) {
      fetch(BASE + "/api/cancel?repo=" + encodeURIComponent(cancelKeyRef.current), { method: "POST" }).catch(() => {});
    }
    abortedRef.current = true; // user stopped → no completion chime
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    patchLast((m) => (m.role === "ai" ? { ...m, status: "⏹ đã dừng" } : m));
    setBusy(false);
  }

  // Chime once when a turn ends — "done" normally, "error" on failure; silent if the user aborted.
  function finalizeSound() {
    if (soundedRef.current || abortedRef.current) return;
    soundedRef.current = true;
    if (sawErrorRef.current) playErrorSound();
    else playDoneSound();
  }

  function watchNeedInfo(t) {
    if (needInfoRef.current) return;
    accRef.current += t;
    if (accRef.current.includes("NEED-INFO")) {
      needInfoRef.current = true;
      // Resumable job (auto): offer an answer box instead of asking the user to stop.
      const canResume = isJob && config.resumable;
      patchLast((m) => ({ ...m, status: canResume ? "⛔ Thiếu thông tin — trả lời bên dưới để chạy tiếp" : "⛔ Thiếu thông tin — bấm Dừng" }));
      if (canResume) setNeedInfoActive(true);
    }
  }

  // Open the stream for one turn/run. `url` is the full /api path with query string.
  function start(display, url, cancelKey) {
    needInfoRef.current = false;
    setNeedInfoActive(false);
    accRef.current = "";
    cancelKeyRef.current = cancelKey || "";
    sawErrorRef.current = false;
    abortedRef.current = false;
    soundedRef.current = false;
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
      if (err) { sawErrorRef.current = true; patchLast((m) => ({ ...m, status: "✗ lỗi" })); }
    });
    es.addEventListener("error_msg", (ev) => {
      const msg = JSON.parse(ev.data);
      patchLast((m) => ({ ...m, errors: [...(m.errors || []), msg] }));
    });
    es.addEventListener("suggest", (ev) => {
      try { const arr = JSON.parse(ev.data); if (Array.isArray(arr)) setSuggests(arr); } catch {}
    });
    es.addEventListener("end", () => { setBusy(false); es.close(); esRef.current = null; finalizeSound(); });
    es.onerror = () => {
      setBusy(false);
      if (esRef.current) { esRef.current.close(); esRef.current = null; sawErrorRef.current = true; finalizeSound(); }
    };
  }

  // Accepted attachment kinds: images, Excel. Anything else is dropped client-side so the user
  // gets the picker filter + a clean send.
  const isUploadable = (f) =>
    f.type.startsWith("image/") ||
    /\.(xlsx?|xlsm|xlsb)$/i.test(f.name || "") ||
    f.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    f.type === "application/vnd.ms-excel";

  // Upload picked/pasted files → server saves them in the agent cwd, returns a path the agent can
  // Read. We hold the paths until the next send, then append them to the message.
  async function uploadFiles(files) {
    const list = Array.from(files || []).filter(isUploadable);
    if (!config.uploadPath || list.length === 0 || uploading) return;
    setUploading(true);
    try {
      const qs = new URLSearchParams(config.params || {});
      for (const file of list) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(BASE + config.uploadPath + "?" + qs.toString(), { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          patchLast((m) => (m.role === "ai" ? { ...m, errors: [...(m.errors || []), data.error || `Tải "${file.name}" thất bại`] } : m));
          continue;
        }
        setAttachments((prev) => [...prev, { name: data.name, path: data.path }]);
      }
    } catch (e) {
      // surfaced inline below the composer is overkill; ignore silently and let the user retry
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAttachment(path) {
    setAttachments((prev) => prev.filter((x) => x.path !== path));
  }

  function onPaste(e) {
    const files = Array.from(e.clipboardData?.files || []).filter(isUploadable);
    if (files.length && config.uploadPath) { e.preventDefault(); uploadFiles(files); }
  }

  function submitChat(text) {
    const typed = (text ?? input).trim();
    if ((!typed && attachments.length === 0) || busy || uploading) return;
    if (attachments.length === 0 && handleClientSlash(typed)) { setInput(""); return; }
    // Append uploaded file paths so the agent reads them via the Read tool. (Excel is already
    // converted to a multi-sheet Markdown file on the server, so the path points to that .md.)
    let q = typed;
    if (attachments.length > 0) {
      const lines = attachments.map((x) => `- ${x.path} (${x.name})`).join("\n");
      q = `${typed}\n\nTệp đính kèm (đọc bằng tool Read):\n${lines}`.trim();
    }
    const display = attachments.length > 0 ? `${typed} 📎${attachments.length}`.trim() : typed;
    const qs = new URLSearchParams({ msg: q, ...(config.params || {}) });
    if (sessionRef.current) qs.set("session", sessionRef.current);
    if (config.editToggle && edit) qs.set("edit", "1");
    setInput("");
    setAttachments([]);
    start(display, config.apiPath + "?" + qs.toString(), "");
  }

  function submitJob() {
    if (busy) return;
    const sub = config.getSubmission?.();
    if (!sub) return;
    lastJobRef.current = sub; // remember for a possible NEED-INFO resume
    const qs = new URLSearchParams(sub.params);
    start(sub.display, config.apiPath + "?" + qs.toString(), sub.cancelKey || "");
  }

  // Missing-info items parsed from the latest ⛔ NEED-INFO block (each on its own `- ` line) —
  // rendered as chips that append to the answer box (no auto-run, so the user can edit/combine).
  const needInfoItems =
    isJob && config.resumable && needInfoActive
      ? (() => {
          const lastAi = [...messages].reverse().find((m) => m.role === "ai");
          const text = lastAi?.text || "";
          const idx = text.indexOf("NEED-INFO");
          if (idx < 0) return [];
          return text
            .slice(idx)
            .split("\n")
            .map((l) => l.trim().match(/^(?:[-*•]|\d+[.)])\s+(.+)$/))
            .map((mm) => (mm ? mm[1].trim() : null))
            .filter(Boolean)
            .slice(0, 6);
        })()
      : [];

  function addAnswerItem(item) {
    setAnswer((prev) => (prev.trim() ? prev.trim() + "; " + item : item));
  }

  // Resume a NEED-INFO'd job: send the user's answer as the next turn's `msg` + the captured
  // session id, so the backend --resumes the same run instead of restarting the ticket.
  function submitJobAnswer() {
    const text = answer.trim();
    const sub = lastJobRef.current;
    if (!text || busy || !sub || !sessionRef.current) return;
    const qs = new URLSearchParams({ ...sub.params, msg: text, session: sessionRef.current });
    setAnswer("");
    start("↳ " + text, config.apiPath + "?" + qs.toString(), sub.cancelKey || "");
  }

  function send(e) {
    e.preventDefault();
    if (isJob) submitJob();
    else submitChat();
  }

  const nav = config.nav || [{ href: "/auto", label: "⚙️ Auto" }, { href: "/", label: "⌂ Home" }];

  return (
    <div className="relative flex h-[100dvh] flex-col">
      <BackToTop targetRef={logRef} btnClass={a.btn} />
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
          {!isJob && config.sessionsPath ? (
            <button
              type="button"
              onClick={openSessions}
              disabled={busy}
              title="Phiên đã lưu"
              className="text-muted hover:text-ink disabled:opacity-40"
            >
              🕘 Phiên
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => clearChat(true)}
            disabled={busy || !messages.length}
            title={config.sessionsPath ? "Xóa hội thoại (xoá luôn phiên đã lưu)" : "Xóa hội thoại"}
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

      {/* Panel danh sách phiên đã lưu — overlay phủ vùng nội dung */}
      {showSessions ? (
        <div className="absolute inset-0 z-20 flex flex-col bg-bg/95 backdrop-blur">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3">
            <b className={`font-bold ${a.text}`}>🕘 Phiên đã lưu</b>
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => { clearChat(false); setShowSessions(false); }}
                className="text-muted hover:text-ink"
              >
                ＋ Phiên mới
              </button>
              <button type="button" onClick={() => setShowSessions(false)} title="Đóng" aria-label="Đóng" className="text-muted hover:text-ink">
                ✕
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-auto p-4">
            {loadingSessions ? <p className="py-8 text-center text-sm text-muted">Đang tải…</p> : null}
            {!loadingSessions && sessions && sessions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">Chưa có phiên nào.</p>
            ) : null}
            {!loadingSessions && sessions
              ? sessions.map((s) => {
                  const active = s.id === sessionRef.current;
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-2 rounded-xl border bg-panel pr-2 transition-colors ${active ? a.ring : "border-line"} ${a.hover}`}
                    >
                      <button
                        type="button"
                        onClick={() => loadSession(s.id)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left"
                      >
                        <span className="shrink-0">{active ? "✅" : "💬"}</span>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-[13px] font-medium text-ink">{s.title}</span>
                          <span className="text-xs text-dim">{relTime(s.mtime)} · {s.turns} lượt</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => deleteSession(s.id, e)}
                        title="Xoá phiên"
                        aria-label="Xoá phiên"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:text-err"
                      >
                        🗑
                      </button>
                    </div>
                  );
                })
              : null}
          </div>
        </div>
      ) : null}

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
                className={`max-w-[80%] self-end whitespace-pre-wrap break-words rounded-lg px-3 py-2.5 text-[13px] leading-normal text-mebubbleink ${a.me}`}
              >
                {m.text}
              </div>
            ) : (
              <div
                key={i}
                className={`w-full self-stretch break-words rounded-lg border border-line bg-panel px-3 py-2.5 text-[13px] leading-normal ${config.renderMarkdown !== false ? "" : "whitespace-pre-wrap"}`}
              >
                {m.status ? <div className="text-xs text-dim">{m.status}</div> : null}
                {config.renderMarkdown !== false ? (m.text ? <Markdown text={m.text} /> : null) : m.text}
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
            {config.resumable && needInfoActive && !busy && sessionRef.current ? (
              <div className="flex flex-col gap-2 rounded-lg border border-warnink/40 bg-warnbg p-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-warnink">
                  ⛔ Trả lời để chạy tiếp (giữ nguyên session)
                </span>
                {needInfoItems.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {needInfoItems.map((it, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => addAnswerItem(it)}
                        title="Bấm để thêm vào ô trả lời"
                        className="max-w-full truncate rounded-full border border-warnink/40 bg-panel px-2.5 py-1 text-left text-[12px] text-warnink transition-colors hover:opacity-80"
                      >
                        + {it}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitJobAnswer(); } }}
                    placeholder="Cung cấp thông tin còn thiếu…"
                    autoFocus
                    className={`${FIELD_BASE} h-10 flex-1 focus:border-blue`}
                  />
                  <button
                    type="button"
                    onClick={submitJobAnswer}
                    disabled={!answer.trim()}
                    className={`h-10 shrink-0 rounded-lg px-4 font-semibold text-field transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${a.btn}`}
                  >
                    ▶ Chạy tiếp
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
          {config.uploadPath && attachments.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {attachments.map((x) => (
                <span key={x.path} className={`flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-[12px] ${a.chip}`}>
                  📎 <span className="max-w-[12rem] truncate">{x.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(x.path)}
                    aria-label="Bỏ ảnh"
                    className="ml-0.5 text-muted hover:text-ink"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className={`flex items-center gap-2 rounded-xl border border-fieldline bg-field px-2 py-1.5 transition-colors ${a.focus}`}>
            {config.uploadPath ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.xlsx,.xls,.xlsm,.xlsb"
                  multiple
                  className="hidden"
                  onChange={(e) => uploadFiles(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy || uploading}
                  title="Đính kèm tệp (ảnh / Excel)"
                  aria-label="Đính kèm tệp"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? "⏳" : "📎"}
                </button>
              </>
            ) : null}
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
              onPaste={config.uploadPath ? onPaste : undefined}
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
                disabled={!input.trim() && attachments.length === 0}
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
          </div>
        )}
      </form>
    </div>
  );
}
