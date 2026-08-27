#!/usr/bin/env node
// Kiểm ảnh evidence mà KHÔNG nạp ảnh vào context của agent.
//
// Lý do tồn tại: console /evidence trước đây `Read` file .png để tự kiểm khoanh đỏ. Đo trên phiên
// 5f3656a6 (2026-08-26): 12 ảnh = 2,4MB base64, mỗi ảnh ~2,5k token và nằm lại trong context đến
// hết phiên → riêng khoản đó ~1,5M token. Script này trả về ĐÚNG các dữ kiện agent cần (kích thước
// ảnh, có viền đỏ không, viền nằm ở đâu) dưới dạng một dòng text.
//
//   node ui-next/scripts/shot-check.mjs <file.png|thư mục> [...]
//
// Mỗi file in 1 dòng:
//   <tên> <W>x<H> red=<số pixel đỏ> box=(x,y)-(x2,y2) <VERDICT>[ +cờ]
// VERDICT: OK | NO-RED | BLANK | UNREADABLE. Cờ: WEAK (quá ít pixel đỏ để là một khung khoanh) ·
// EDGE (viền chạm mép ảnh, có thể bị cắt) · FULL-VIEWPORT (viền phủ gần kín ảnh — khoanh nhầm
// wrapper, xem SCREEN_EVIDENCE.md §4).
// Exit code 1 nếu có file không OK → dùng được trong `&&` của lệnh chụp.
//
// Tự decode PNG bằng zlib (không có sharp/ImageMagick trên máy này). Hỗ trợ PNG 8-bit
// truecolor/truecolor-alpha, không interlace — đúng dạng Chrome `Page.captureScreenshot` xuất ra.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// Viền khoanh đỏ do window.__mark vẽ là #e00 = rgb(238,0,0); nhãn note cũng nền #e00.
// Ngưỡng rộng tay một chút cho pixel bị anti-alias ở mép viền.
const isRed = (r, g, b) => r > 180 && g < 80 && b < 80;

function decodePng(buf) {
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) throw new Error("không phải PNG");
  let off = 8;
  let ihdr = null;
  const idat = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        depth: data[8],
        color: data[9],
        interlace: data[12],
      };
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len; // len + type(4) + data + crc(4)
  }
  if (!ihdr) throw new Error("thiếu IHDR");
  if (ihdr.depth !== 8 || (ihdr.color !== 2 && ihdr.color !== 6) || ihdr.interlace !== 0) {
    throw new Error(`PNG dạng chưa hỗ trợ (depth=${ihdr.depth} color=${ihdr.color} interlace=${ihdr.interlace})`);
  }
  const bpp = ihdr.color === 6 ? 4 : 3;
  const stride = ihdr.width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(stride * ihdr.height);
  let pos = 0;
  for (let y = 0; y < ihdr.height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 0xff;
    }
  }
  return { ...ihdr, bpp, stride, pixels: out };
}

function inspect(file) {
  const name = path.basename(file);
  let img;
  try {
    const buf = readFileSync(file);
    if (!buf.length) return { name, line: `${name} UNREADABLE (file rỗng)`, ok: false };
    img = decodePng(buf);
  } catch (e) {
    return { name, line: `${name} UNREADABLE (${e.message})`, ok: false };
  }
  const { width, height, bpp, stride, pixels } = img;
  let red = 0, x1 = Infinity, y1 = Infinity, x2 = -1, y2 = -1;
  // Đếm màu khác nhau bằng mẫu thưa — chỉ để phân biệt ảnh trắng trơn với ảnh có nội dung.
  const seen = new Set();
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    for (let x = 0; x < width; x++) {
      const i = row + x * bpp;
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      if (isRed(r, g, b)) {
        red++;
        if (x < x1) x1 = x;
        if (y < y1) y1 = y;
        if (x > x2) x2 = x;
        if (y > y2) y2 = y;
      }
      if (seen.size < 50 && ((x | y) & 15) === 0) seen.add((r << 16) | (g << 8) | b);
    }
  }
  const flags = [];
  let verdict;
  if (seen.size <= 2) verdict = "BLANK";
  else if (red < 200) verdict = "NO-RED"; // viền 3px của một phần tử nhỏ nhất cũng vượt xa mức này
  else verdict = "OK";
  if (red >= 200) {
    // Viền 3px của một nút nhỏ (60×24) đã cho ~1.000 pixel đỏ. Dưới 800 thường là vài chấm đỏ có
    // sẵn trong giao diện (icon, badge) chứ không phải khoanh đỏ → bắt agent nhìn lại.
    if (red < 800) flags.push("WEAK");
    if (x1 <= 1 || y1 <= 1 || x2 >= width - 2 || y2 >= height - 2) flags.push("EDGE");
    if (x2 - x1 >= width * 0.98 && y2 - y1 >= height * 0.98) flags.push("FULL-VIEWPORT");
  }
  const box = red ? `box=(${x1},${y1})-(${x2},${y2})` : "box=-";
  const ok = verdict === "OK" && !flags.length;
  return { name, ok, line: `${name} ${width}x${height} red=${red} ${box} ${verdict}${flags.length ? " +" + flags.join(" +") : ""}` };
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error("dùng: node ui-next/scripts/shot-check.mjs <file.png|thư mục> [...]");
  process.exit(2);
}
const files = [];
for (const a of args) {
  try {
    if (statSync(a).isDirectory()) {
      for (const f of readdirSync(a).sort()) if (f.toLowerCase().endsWith(".png")) files.push(path.join(a, f));
    } else files.push(a);
  } catch (e) {
    console.log(`${a} UNREADABLE (${e.code || e.message})`);
  }
}
let bad = 0;
for (const f of files) {
  const r = inspect(f);
  if (!r.ok) bad++;
  console.log(r.line);
}
if (files.length > 1) console.log(`--- ${files.length} ảnh · OK ${files.length - bad} · cần xem lại ${bad}`);
process.exit(bad ? 1 : 0);
