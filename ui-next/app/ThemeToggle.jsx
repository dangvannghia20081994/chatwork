"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle({ className = "" }) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const el = document.documentElement;
    const next = !el.classList.contains("dark");
    el.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? "Chuyển sáng" : "Chuyển tối"}
      aria-label="Đổi giao diện sáng/tối"
      className={`rounded-md border border-fieldline bg-field px-2.5 py-1.5 text-ink hover:border-blue ${className}`}
    >
      {dark ? "🌙" : "☀️"}
    </button>
  );
}
