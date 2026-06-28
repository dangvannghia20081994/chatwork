"use client";

import { useEffect, useState } from "react";

// Nút "lên đầu trang" — hiện ở giữa cạnh phải khi cuộn xuống >300px, hợp cho hội thoại dài.
// Giống /dev bên elearning, nhưng cuộn TRONG container (targetRef) chứ không phải window: layout chat
// là h-[100dvh] nên chỉ vùng log (overflow-auto) cuộn. btnClass: màu nền theo accent từng project.
export default function BackToTop({ targetRef, btnClass = "bg-blue" }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = targetRef?.current;
    if (!el) return;
    const onScroll = () => setShow(el.scrollTop > 300);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [targetRef]);

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={() => targetRef?.current?.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Lên đầu trang"
      title="Lên đầu trang"
      className={`fixed right-5 top-1/2 z-50 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-2xl text-field shadow-lg transition hover:opacity-90 active:scale-95 ${btnClass}`}
    >
      ↑
    </button>
  );
}
