// scripts/snapshot.mjs — chụp screenshot một trang web đang chạy vào ui-next/.snapshots/ rồi in ra
// ĐƯỜNG DẪN ẢNH (đã kèm basePath, vd /ai/api/snapshot/xxx.png) để chèn vào Markdown chat.
// Dùng bởi agent chat khi user yêu cầu "check trên web / xem giao diện" sau khi sửa code.
//
// Ảnh KHÔNG lưu vào public/: Next 16 + turbopack bake danh sách file public/ lúc build, `next start`
// KHÔNG serve file thêm vào public/ sau đó. Thay vào đó ảnh được serve qua route handler động
// app/api/snapshot/[name] (đọc từ .snapshots/ lúc request) — không cần build lại mỗi lần chụp.
//
// KHÔNG cần npm dep: điều khiển google-chrome-stable của hệ thống ở chế độ headless.
//
// Usage:
//   node <ui-next>/scripts/snapshot.mjs <url> [--label ten] [--wait ms] [--width px] [--height px]
// Ví dụ:
//   node .../snapshot.mjs http://localhost:5173/issues --label issues
// Stdout (dòng cuối) = đường dẫn ảnh, vd: /ai/api/snapshot/issues-1a2b3c4d.png

import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, readdirSync, statSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_NEXT = path.resolve(__dirname, ".."); // scripts/ -> ui-next/
const OUT_DIR = path.join(UI_NEXT, ".snapshots"); // served via app/api/snapshot/[name], NOT public/
const MAX_KEEP = 60; // giữ tối đa 60 ảnh, xoá cũ nhất khi vượt

// ---------- args ----------
const argv = process.argv.slice(2);
const url = argv[0];
if (!url || url.startsWith("--")) {
  console.error("Usage: node scripts/snapshot.mjs <url> [--label ten] [--wait ms] [--width px] [--height px]");
  process.exit(2);
}
function opt(name, def) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}
const label = (opt("label", "shot").replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 30)) || "shot";
const wait = Math.min(Math.max(parseInt(opt("wait", "4000"), 10) || 4000, 0), 30000);
const width = Math.min(Math.max(parseInt(opt("width", "1280"), 10) || 1280, 320), 3840);
const height = Math.min(Math.max(parseInt(opt("height", "800"), 10) || 800, 240), 4320);

// ---------- basePath cho URL trả về ----------
function basePath() {
  if (process.env.NEXT_PUBLIC_BASE_PATH != null) return process.env.NEXT_PUBLIC_BASE_PATH;
  try {
    const env = readFileSync(path.join(UI_NEXT, ".env"), "utf8");
    const m = env.match(/^\s*NEXT_PUBLIC_BASE_PATH\s*=\s*(.*)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  } catch {}
  return "";
}

// ---------- chrome binary ----------
function chromeBin() {
  for (const b of ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser"]) {
    if (spawnSync("which", [b]).status === 0) return b;
  }
  return "google-chrome-stable";
}

mkdirSync(OUT_DIR, { recursive: true });

// dọn ảnh cũ để thư mục không phình mãi
try {
  const files = readdirSync(OUT_DIR)
    .filter((f) => f.endsWith(".png"))
    .map((f) => ({ f, t: statSync(path.join(OUT_DIR, f)).mtimeMs }))
    .sort((a, b) => a.t - b.t);
  while (files.length > MAX_KEEP) rmSync(path.join(OUT_DIR, files.shift().f), { force: true });
} catch {}

const name = `${label}-${randomUUID().slice(0, 8)}.png`;
const outFile = path.join(OUT_DIR, name);

// --headless=new + --virtual-time-budget để SPA có thời gian render trước khi chụp.
// Chỉ chụp vùng viewport (không full-page); tăng --height nếu cần nhiều nội dung hơn.
const args = [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-software-rasterizer",
  "--hide-scrollbars",
  `--window-size=${width},${height}`,
  `--virtual-time-budget=${wait}`,
  `--screenshot=${outFile}`,
  url,
];

const res = spawnSync(chromeBin(), args, {
  timeout: wait + 30000,
  stdio: ["ignore", "pipe", "pipe"],
});

if (res.status !== 0 || !existsSync(outFile)) {
  console.error(
    "Chụp thất bại:",
    res.error?.message || res.stderr?.toString().trim() || `exit ${res.status}`
  );
  process.exit(1);
}

const bp = basePath();
console.log(`${bp}/api/snapshot/${name}`);
