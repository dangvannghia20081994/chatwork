// scripts/snapshot.mjs — chụp screenshot một trang web đang chạy vào ui-next/.snapshots/ rồi in ra
// ĐƯỜNG DẪN ẢNH (đã kèm basePath, vd /ai/api/snapshot/xxx.png) để chèn vào Markdown chat.
// Dùng bởi agent chat khi user yêu cầu "check trên web / xem giao diện" sau khi sửa code.
//
// KHOANH ĐỎ ITEM (--mark): truyền 1 hoặc nhiều `--mark "<css-selector>[::ghi chú tiếng Việt]"`.
//   - 1 item  → chỉ khoanh đỏ (bỏ phần `::note`).
//   - nhiều item → khoanh đỏ + note tiếng Việt cạnh mỗi item (tự đánh số 1., 2., …).
// Khi có --mark, script điều khiển Chrome qua CDP để inject overlay (biết toạ độ element trong trang)
// rồi mới chụp. Không có --mark → chụp thô một phát bằng --screenshot (nhanh, mặc định).
//
// Ảnh KHÔNG lưu vào public/: Next 16 + turbopack bake danh sách file public/ lúc build, `next start`
// KHÔNG serve file thêm vào public/ sau đó. Thay vào đó ảnh được serve qua route handler động
// app/api/snapshot/[name] (đọc từ .snapshots/ lúc request) — không cần build lại mỗi lần chụp.
//
// KHÔNG cần npm dep: điều khiển google-chrome-stable của hệ thống ở chế độ headless (CDP qua
// WebSocket/fetch có sẵn trong Node ≥ 21).
//
// Usage:
//   node <ui-next>/scripts/snapshot.mjs <url> [--label ten] [--wait ms] [--width px] [--height px]
//                                             [--mark "<sel>[::note]"] [--mark ...]
// Ví dụ:
//   node .../snapshot.mjs http://localhost:5173/issues --label issues
//   node .../snapshot.mjs http://localhost:5173/issues --mark "#save-btn"
//   node .../snapshot.mjs http://localhost:5173/issues --mark ".row-1::Dòng bị lỗi" --mark "#total::Tổng sai"
// Stdout (dòng cuối) = đường dẫn ảnh, vd: /ai/api/snapshot/issues-1a2b3c4d.png

import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, readdirSync, statSync, rmSync, writeFileSync } from "node:fs";
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
  console.error(
    'Usage: node scripts/snapshot.mjs <url> [--label ten] [--wait ms] [--width px] [--height px] [--mark "<sel>[::note]"]'
  );
  process.exit(2);
}
function opt(name, def) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}
// Cờ lặp lại được (vd nhiều --mark): gom toàn bộ giá trị.
function optAll(name) {
  const out = [];
  for (let i = 0; i < argv.length - 1; i++) if (argv[i] === `--${name}`) out.push(argv[i + 1]);
  return out;
}
const label = (opt("label", "shot").replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 30)) || "shot";
const wait = Math.min(Math.max(parseInt(opt("wait", "4000"), 10) || 4000, 0), 30000);
const width = Math.min(Math.max(parseInt(opt("width", "1280"), 10) || 1280, 320), 3840);
const height = Math.min(Math.max(parseInt(opt("height", "800"), 10) || 800, 240), 4320);

// --mark "<selector>[::ghi chú]" (lặp lại được). Tách selector và note ở chuỗi "::" đầu tiên.
const marks = optAll("mark")
  .map((s) => {
    const i = s.indexOf("::");
    return i >= 0
      ? { selector: s.slice(0, i).trim(), note: s.slice(i + 2).trim() }
      : { selector: s.trim(), note: "" };
  })
  .filter((m) => m.selector);

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

const BASE_CHROME_ARGS = [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-software-rasterizer",
  "--hide-scrollbars",
];

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

// ---------- overlay chạy TRONG TRANG (browser context) ----------
// Với mỗi mark: vẽ khung đỏ quanh element; nếu có note thì thêm nhãn đỏ cạnh element (nhiều item thì
// tự đánh số). Trả về số item khoanh được để cảnh báo selector không khớp. Hàm này KHÔNG chạy ở Node,
// nó được stringify rồi Runtime.evaluate trong Chrome.
function annotate(marks) {
  var NS = "__snap_anno__";
  Array.prototype.forEach.call(document.querySelectorAll("." + NS), function (e) {
    e.remove();
  });
  var resolved = marks.map(function (mk) {
    var el = null;
    try {
      el = document.querySelector(mk.selector);
    } catch (e) {}
    return { el: el, note: mk.note };
  });
  var hits = resolved.filter(function (x) {
    return x.el;
  });
  if (hits[0]) {
    try {
      hits[0].el.scrollIntoView({ block: "center", inline: "center" });
    } catch (e) {}
  }
  var multi = hits.length > 1;
  var n = 0;
  hits.forEach(function (x) {
    n++;
    var r = x.el.getBoundingClientRect();
    var pad = 4;
    var box = document.createElement("div");
    box.className = NS;
    box.style.cssText =
      "position:fixed;z-index:2147483647;pointer-events:none;border:3px solid #ff1e1e;border-radius:6px;" +
      "box-shadow:0 0 0 2px rgba(255,255,255,.55);left:" +
      (r.left - pad) +
      "px;top:" +
      (r.top - pad) +
      "px;width:" +
      (r.width + pad * 2) +
      "px;height:" +
      (r.height + pad * 2) +
      "px;";
    document.body.appendChild(box);
    if (x.note) {
      var lbl = document.createElement("div");
      lbl.className = NS;
      lbl.textContent = (multi ? n + ". " : "") + x.note;
      lbl.style.cssText =
        "position:fixed;z-index:2147483647;pointer-events:none;background:#ff1e1e;color:#fff;" +
        "font:600 13px/1.4 -apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:3px 8px;border-radius:5px;" +
        "max-width:260px;box-shadow:0 1px 4px rgba(0,0,0,.35);";
      document.body.appendChild(lbl);
      var lr = lbl.getBoundingClientRect();
      var lx = r.right + 8;
      var ly = r.top - pad;
      if (lx + lr.width > window.innerWidth - 4) lx = r.left - pad - lr.width - 8;
      if (lx < 4) {
        lx = Math.max(4, r.left - pad);
        ly = r.top - pad - lr.height - 6;
        if (ly < 4) ly = r.bottom + 6;
      }
      if (ly + lr.height > window.innerHeight - 4) ly = window.innerHeight - lr.height - 4;
      if (ly < 4) ly = 4;
      lbl.style.left = lx + "px";
      lbl.style.top = ly + "px";
    }
  });
  return hits.length;
}

// ---------- CDP client tối giản trên WebSocket có sẵn của Node ----------
function cdpSender(ws) {
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    let msg;
    try {
      msg = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
    } catch {
      return;
    }
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? p.rej(new Error(msg.error.message)) : p.res(msg.result);
    }
  });
  return (method, params = {}) =>
    new Promise((res, rej) => {
      const mid = ++id;
      pending.set(mid, { res, rej });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
}

// Chụp có khoanh đỏ/note qua CDP. Trả về số item khoanh được. Ném lỗi nếu không dựng được phiên CDP
// (caller sẽ fallback sang chụp thường).
async function captureWithMarks() {
  const chrome = spawn(
    chromeBin(),
    [...BASE_CHROME_ARGS, `--window-size=${width},${height}`, "--remote-debugging-port=0", url],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  try {
    const wsUrl = await new Promise((resolve, reject) => {
      let buf = "";
      const to = setTimeout(() => reject(new Error("hết giờ chờ DevTools")), 15000);
      chrome.stderr.on("data", (d) => {
        buf += d.toString();
        const m = buf.match(/ws:\/\/[^\s]+/);
        if (m) {
          clearTimeout(to);
          resolve(m[0]);
        }
      });
      chrome.on("exit", (c) => {
        clearTimeout(to);
        reject(new Error("chrome thoát sớm (exit " + c + ")"));
      });
    });

    const port = new URL(wsUrl).port;
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const page = targets.find((t) => t.type === "page") || targets[0];
    if (!page?.webSocketDebuggerUrl) throw new Error("không tìm thấy page target");

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener("open", res, { once: true });
      ws.addEventListener("error", () => rej(new Error("WebSocket lỗi")), { once: true });
    });

    const send = cdpSender(ws);
    await send("Page.enable");
    await send("Runtime.enable");
    await new Promise((r) => setTimeout(r, wait)); // cho SPA render xong

    const expr = `(${annotate.toString()})(${JSON.stringify(marks)})`;
    const evalRes = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
    const found = Number(evalRes?.result?.value) || 0;

    const shot = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(outFile, Buffer.from(shot.data, "base64"));
    try {
      ws.close();
    } catch {}
    return found;
  } finally {
    try {
      chrome.kill();
    } catch {}
  }
}

// ---------- chụp thường một phát (mặc định khi không có --mark; cũng là fallback) ----------
function captureSimple() {
  const args = [
    ...BASE_CHROME_ARGS,
    `--window-size=${width},${height}`,
    `--virtual-time-budget=${wait}`,
    `--screenshot=${outFile}`,
    url,
  ];
  const res = spawnSync(chromeBin(), args, { timeout: wait + 30000, stdio: ["ignore", "pipe", "pipe"] });
  if (res.status !== 0 || !existsSync(outFile)) {
    throw new Error(res.error?.message || res.stderr?.toString().trim() || `exit ${res.status}`);
  }
}

// ---------- điều phối ----------
let done = false;
if (marks.length) {
  try {
    const found = await captureWithMarks();
    done = existsSync(outFile);
    if (done && found < marks.length) {
      console.error(`Cảnh báo: chỉ khoanh được ${found}/${marks.length} item — selector có thể không khớp.`);
    }
  } catch (e) {
    console.error("Khoanh đỏ thất bại, chuyển sang chụp thường:", e.message);
  }
}

if (!done) {
  try {
    captureSimple();
  } catch (e) {
    console.error("Chụp thất bại:", e.message);
    process.exit(1);
  }
}

const bp = basePath();
console.log(`${bp}/api/snapshot/${name}`);
