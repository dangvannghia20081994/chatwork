"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "../ThemeToggle";

// basePath behind the reverse proxy (e.g. "/ai"). Next prefixes Link/assets automatically but NOT
// raw fetch() — so /api/sprint must be prefixed manually, else it escapes to the gateway's /* app.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

function todayISO() {
  const n = new Date();
  const p = (x) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}

export default function SprintPage() {
  const [file, setFile] = useState(null);
  const [date, setDate] = useState("");
  const [link, setLink] = useState("https://docs.google.com/spreadsheets/d/1A7pAL44vGtcSYxU2tlh3VKoNM-FRCXS80DVEd9uEdhU/edit?gid=525800568#gid=525800568");
  const [to, setTo] = useState("6040320:Le Ngoc Chien");
  const [showOpts, setShowOpts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { chatwork, people, grand, dateISO, sprint }
  const [text, setText] = useState(""); // editable Chatwork block
  const [copied, setCopied] = useState(false);
  const dropRef = useRef(null);

  // default date = hôm nay (set ở client để tránh hydration mismatch)
  useEffect(() => setDate(todayISO()), []);

  async function submit(e) {
    e?.preventDefault();
    if (!file) {
      setError("Chọn file Excel trước đã.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (date) fd.append("date", date);
      if (link.trim()) fd.append("link", link.trim());
      if (to.trim()) fd.append("to", to.trim());
      const res = await fetch(BASE + "/api/sprint", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xử lý thất bại");
      setResult(data);
      setText(data.chatwork);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    dropRef.current?.classList.remove("border-blue");
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Không copy được — bôi đen và Ctrl+C thủ công.");
    }
  }

  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col px-5 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue/15 text-lg text-blue">📉</span>
          <div>
            <div className="font-semibold text-ink">Sprint · Giờ âm</div>
            <div className="text-xs text-dim">Upload Excel burndown → report Actual giờ âm (Chatwork)</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-muted no-underline hover:text-ink">⌂ Home</Link>
          <ThemeToggle />
        </div>
      </header>

      <form onSubmit={submit} className="space-y-4">
        {/* drop zone */}
        <label
          ref={dropRef}
          onDragOver={(e) => {
            e.preventDefault();
            dropRef.current?.classList.add("border-blue");
          }}
          onDragLeave={() => dropRef.current?.classList.remove("border-blue")}
          onDrop={onDrop}
          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line bg-panel px-4 py-8 text-center transition-colors hover:border-blue/60"
        >
          <span className="text-2xl">📂</span>
          <span className="text-sm text-ink">
            {file ? file.name : "Kéo–thả hoặc bấm để chọn file Excel"}
          </span>
          <span className="text-xs text-dim">.xlsx / .xls — cần 2 sheet Expect & Actual</span>
          <input
            type="file"
            accept=".xlsx,.xls,.xlsm,.xlsb"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs text-muted">Ngày</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-fieldline bg-field px-3 py-2 text-sm text-ink"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowOpts((v) => !v)}
            className="pb-2 text-xs text-muted hover:text-ink"
          >
            {showOpts ? "− Ẩn tùy chọn" : "+ Tùy chọn (link sheet / người nhận)"}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="ml-auto rounded-lg bg-blue px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Đang tính…" : "Tạo report"}
          </button>
        </div>

        {showOpts && (
          <div className="grid gap-3 rounded-xl border border-line bg-panel p-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted">Link Google Sheet</label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://docs.google.com/…"
                className="w-full rounded-lg border border-fieldline bg-field px-3 py-2 text-sm text-ink"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Người nhận (To) — id:Tên</label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="6040320:Le Ngoc Chien"
                className="w-full rounded-lg border border-fieldline bg-field px-3 py-2 text-sm text-ink"
              />
            </div>
          </div>
        )}
      </form>

      {error && (
        <div className="mt-4 rounded-lg border border-err/40 bg-err/10 px-3 py-2 text-sm text-err">{error}</div>
      )}

      {result && (
        <section className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-semibold text-ink">Ngày {result.dateISO}</span>
            {result.sprint && <span className="text-muted">· Sprint {result.sprint}</span>}
            <span className="text-muted">· {result.people.length} người âm</span>
            <span className="font-semibold text-blue">· Tổng {result.grand}h</span>
          </div>

          {result.people.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-panel text-left text-muted">
                    <th className="px-3 py-2 font-medium">Người</th>
                    <th className="px-3 py-2 text-right font-medium">Giờ âm</th>
                    <th className="px-3 py-2 font-medium">Ticket</th>
                  </tr>
                </thead>
                <tbody>
                  {result.people.map((p) => (
                    <tr key={p.name} className="border-t border-line align-top">
                      <td className="px-3 py-2 font-medium text-ink">{p.name}</td>
                      <td className="px-3 py-2 text-right text-err">{p.total}h</td>
                      <td className="px-3 py-2 text-muted">
                        {p.tickets.map((t, i) => (
                          <div key={i}>
                            {t.id} <span className="text-dim">(E {t.expect}/A {t.actual} → +{t.over})</span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-muted">Block Chatwork (sửa được — điền lý do trước khi gửi)</span>
              <button
                type="button"
                onClick={copy}
                className="rounded-lg bg-blue/15 px-3 py-1 text-xs font-semibold text-blue hover:bg-blue/25"
              >
                {copied ? "✓ Đã copy" : "Copy"}
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={Math.min(24, text.split("\n").length + 1)}
              className="w-full rounded-xl border border-fieldline bg-field p-3 font-mono text-[13px] leading-relaxed text-ink"
            />
          </div>
        </section>
      )}
    </main>
  );
}
