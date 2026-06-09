"use client";

// Shared shell for the auto pages (REZIL /auto + Story /story). Owns the SSE streaming,
// output rendering, status, and the sidebar/main layout. Each page only supplies its form
// fields + endpoint/params via props — see app/auto/Auto.jsx and app/story/StoryAuto.jsx.
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "../ThemeToggle";

// Literal class strings per accent (Tailwind JIT only sees static classes).
const ACCENT = {
  blue: { solid: "bg-blue", chip: "bg-blue/15 text-blue", dot: "bg-blue", glow: "from-blue to-purple", busyText: "text-blue", busyDot: "bg-blue" },
  purple: { solid: "bg-purple", chip: "bg-purple/15 text-purple", dot: "bg-purple", glow: "from-purple to-blue", busyText: "text-purple", busyDot: "bg-purple" },
};

// Shared field styles so each page's inputs look identical.
export const LABEL = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted";
export const FIELD_BASE = "w-full rounded-lg border border-fieldline bg-field px-3 text-ink outline-none transition-colors";
export const fieldFocus = (accent) => (accent === "purple" ? "focus:border-purple" : "focus:border-blue");

export default function AutoRunner({
  accent = "blue",
  icon, sidebarTitle, sidebarSub, hint,
  agentTitle, agentSub, chatHref,
  endpoint, getParams, cancelRepo, storageKey,
  children,
}) {
  const a = ACCENT[accent] || ACCENT.blue;
  const [items, setItems] = useState([]); // {kind:'text'|'dim'|'err', text}
  const [status, setStatus] = useState("idle");
  const [statusClass, setStatusClass] = useState("");
  const [busy, setBusy] = useState(false);

  const esRef = useRef(null);
  const accRef = useRef("");
  const needInfoRef = useRef(false);
  const openedRef = useRef(false);
  const outRef = useRef(null);
  const itemsRef = useRef([]);
  const KEY = storageKey ? `auto-output:${storageKey}` : null;

  // keep a ref of latest items for persistence
  useEffect(() => { itemsRef.current = items; }, [items]);

  // restore last saved output on mount
  useEffect(() => {
    if (!KEY) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) { setItems(arr); setStatus("kết quả lần trước (đã lưu)"); }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist when a run finishes (busy → false), skip while streaming
  useEffect(() => {
    if (busy || !KEY) return;
    try {
      if (itemsRef.current.length) localStorage.setItem(KEY, JSON.stringify(itemsRef.current));
    } catch {}
  }, [busy, KEY]);

  function clearOutput() {
    setItems([]);
    itemsRef.current = [];
    setStatus("idle");
    setStatusClass("");
    try { if (KEY) localStorage.removeItem(KEY); } catch {}
  }

  function scroll() {
    requestAnimationFrame(() => {
      if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight;
    });
  }
  function pushLine(kind, text) {
    setItems((prev) => [...prev, { kind, text }]);
    scroll();
  }
  function appendText(text) {
    setItems((prev) => {
      const next = prev.slice();
      const last = next[next.length - 1];
      if (last && last.kind === "text") next[next.length - 1] = { ...last, text: last.text + text };
      else next.push({ kind: "text", text });
      return next;
    });
    scroll();
  }
  function watchNeedInfo(t) {
    if (needInfoRef.current) return;
    accRef.current += t;
    if (accRef.current.includes("NEED-INFO")) {
      needInfoRef.current = true;
      setStatus("⛔ Thiếu thông tin để code — hãy bấm Cancel để dừng");
      setStatusClass("warn");
    }
  }

  function run(e) {
    e.preventDefault();
    if (busy) return;
    setItems([]);
    accRef.current = "";
    needInfoRef.current = false;
    openedRef.current = false;
    setStatus("running…");
    setStatusClass("");
    setBusy(true);

    const qs = new URLSearchParams(getParams());
    const es = new EventSource(endpoint + "?" + qs.toString());
    esRef.current = es;

    es.onopen = () => { openedRef.current = true; };
    es.addEventListener("delta", (ev) => { const t = JSON.parse(ev.data); appendText(t); watchNeedInfo(t); });
    es.addEventListener("tool", (ev) => pushLine("dim", "· " + JSON.parse(ev.data)));
    es.addEventListener("result", (ev) => {
      const r = JSON.parse(ev.data);
      if (!needInfoRef.current && (r.isError !== undefined || r.exitCode !== undefined)) {
        const err = r.isError || (r.exitCode !== undefined && r.exitCode !== 0);
        setStatus(err ? "error" : "done");
        setStatusClass(err ? "" : "ok");
      }
    });
    es.addEventListener("error_msg", (ev) => pushLine("err", JSON.parse(ev.data)));
    es.addEventListener("end", () => { setBusy(false); es.close(); esRef.current = null; });
    es.onerror = () => {
      if (!openedRef.current) {
        setStatus("⚠ Không mở được stream — có thể đang bận. Mở tab khác hoặc đợi.");
        setStatusClass("warn");
      } else if (!needInfoRef.current) {
        setStatus("stream closed");
      }
      setBusy(false);
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
    };
  }

  function cancel() {
    fetch("/api/cancel?repo=" + encodeURIComponent(cancelRepo), { method: "POST" });
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setBusy(false);
    setStatus("cancelled");
    setStatusClass("");
  }

  const statusColor =
    statusClass === "warn" ? "text-warnink" : statusClass === "ok" ? "text-green" : busy ? a.busyText : "text-muted";
  const dotColor =
    statusClass === "warn" ? "bg-warnink" : statusClass === "ok" ? "bg-green" : busy ? `${a.busyDot} animate-pulse` : "bg-dim";

  return (
    <div className="md:grid md:h-[100dvh] md:grid-cols-[380px_1fr]">
      {/* sidebar */}
      <form
        onSubmit={run}
        className="relative flex flex-col overflow-auto border-b border-line bg-panel p-5 md:border-b-0 md:border-r"
      >
        <div aria-hidden className={`pointer-events-none absolute -top-24 left-0 h-48 w-full rounded-full bg-gradient-to-r ${a.glow} opacity-10 blur-[80px]`} />
        <div className="relative mb-5 flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${a.chip}`}>{icon}</span>
          <div className="leading-tight">
            <div className="font-semibold text-ink">{sidebarTitle}</div>
            <div className="text-xs text-dim">{sidebarSub}</div>
          </div>
        </div>

        {children}

        {hint ? <p className="mt-3 text-xs leading-relaxed text-dim">{hint}</p> : null}

        <div className="mt-5 flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-lg font-semibold text-field transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${a.solid}`}
          >
            {busy ? "Đang chạy…" : "▶ Run"}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={!busy}
            className="h-10 rounded-lg border border-fieldline px-4 text-ink transition-colors hover:border-err hover:text-err disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* main */}
      <main className="flex min-w-0 flex-col max-md:min-h-[60vh]">
        <header className="flex items-center gap-3 overflow-hidden border-b border-line bg-panel px-5 py-3">
          <span className={`h-2 w-2 shrink-0 rounded-full ${a.dot}`} />
          <b className="shrink-0 whitespace-nowrap font-bold text-ink">{agentTitle}</b>
          <small className="min-w-0 truncate text-muted max-sm:hidden">{agentSub}</small>
          <span className="ml-auto flex shrink-0 items-center gap-3.5">
            <a href={chatHref} className="text-blue hover:underline">💬 Chat</a>
            <a href="/" className="text-blue hover:underline">⌂ Home</a>
            <ThemeToggle />
          </span>
        </header>
        <div className="flex items-center gap-2 border-b border-line px-5 py-2.5 text-[13px]">
          <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
          <span className={`min-w-0 truncate ${statusColor}`}>{status}</span>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearOutput}
              disabled={busy}
              title="Xoá kết quả đã lưu"
              aria-label="Xoá kết quả"
              className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-err/15 hover:text-err disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          )}
        </div>
        <pre ref={outRef} className="m-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-5 text-[13px] leading-relaxed">
          {items.length === 0 && !busy ? (
            <span className="text-dim">Kết quả sẽ stream ở đây…</span>
          ) : (
            items.map((it, i) =>
              it.kind === "text" ? (
                <span key={i}>{it.text}</span>
              ) : (
                <span key={i} className={it.kind === "err" ? "text-err" : "text-dim"}>{it.text + "\n"}</span>
              )
            )
          )}
        </pre>
      </main>
    </div>
  );
}
