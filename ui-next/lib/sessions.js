// Đọc danh sách + nội dung các phiên chat của Claude CLI cho từng project.
// Claude lưu mỗi phiên thành 1 file .jsonl trong CLAUDE_CONFIG_DIR/projects/<cwd-encoded>/.
// Mỗi project (rezil/story/film/free) có cwd riêng → thư mục phiên riêng, nên MỌI hàm ở đây
// nhận `project` và tự resolve cwd qua resolveProject. Node runtime, chỉ dùng ở server (fs).
import fs from "node:fs";
import path from "node:path";
import { claudeHome, resolveProject, normalizeProject, accountHome, listAccounts } from "./config.js";

// Tên thư mục phiên do Claude mã hoá từ CWD: thay mọi ký tự [/.] → '-'
// (vd /home/nghiadv/IdeaProjects/rezil-esms → -home-nghiadv-IdeaProjects-rezil-esms).
function encCwd(project) {
  const { cwd } = resolveProject(normalizeProject(project));
  return cwd.replace(/[/.]/g, "-");
}

// Thư mục .jsonl của 1 project trong 1 CLAUDE_CONFIG_DIR bất kỳ.
function projectDirIn(home, project) {
  return path.join(home, "projects", encCwd(project));
}

// Thư mục .jsonl của 1 project ở account mà process đang chạy (hành vi cũ, giữ nguyên).
function projectDir(project) {
  return projectDirIn(claudeHome(), project);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SUGGEST_MARK = "<<<SUGGEST>>>";

// Bỏ khối gợi ý follow-up khỏi text assistant (chỉ lấy phần hiển thị, giống feedText ở claude.js).
function stripSuggest(text) {
  const idx = text.indexOf(SUGGEST_MARK);
  return idx < 0 ? text : text.slice(0, idx).trimEnd();
}

// Dòng "user" do CLI tự sinh chứ không phải người gõ: thông báo agent nền chạy xong
// (origin.kind = "task-notification"), meta line, tóm tắt compact… Nếu không lọc, khối XML nội bộ
// sẽ hiện nguyên xi thành bong bóng chat khi mở lại phiên.
function isSyntheticUser(ev) {
  if (ev.isMeta || ev.isCompactSummary) return true;
  const kind = ev.origin && ev.origin.kind;
  return !!kind && kind !== "human";
}

// Các khối XML nội bộ của CLI (task-notification, output slash/bash command, system-reminder…).
// Chặn theo nội dung để phiên cũ — ghi bởi bản CLI chưa có field `origin` — cũng sạch.
const SYNTHETIC_PREFIXES = [
  "<task-notification>",
  "<system-reminder>",
  "<local-command-caveat>",
  "<local-command-stdout>",
  "<command-",
  "<bash-input>",
  "<bash-stdout>",
  "<bash-stderr>",
];

// Lấy text người dùng gõ từ 1 dòng "user". Bỏ tin tool_result và các meta lệnh nội bộ của CLI.
function userPromptText(content) {
  let text = "";
  if (typeof content === "string") {
    text = content;
  } else if (Array.isArray(content)) {
    if (content.some((c) => c && c.type === "tool_result")) return null;
    text = content.map((c) => (c && typeof c === "object" && "text" in c ? String(c.text) : "")).join("");
  }
  text = text.trim();
  if (!text) return null;
  if (SYNTHETIC_PREFIXES.some((p) => text.startsWith(p))) return null;
  // Cắt phần "Tệp đính kèm (đọc bằng tool Read…)" mà client nối vào cuối prompt.
  const attIdx = text.indexOf("\n\nTệp đính kèm");
  if (attIdx > 0) text = text.slice(0, attIdx).trimEnd();
  return text || null;
}

// Parse 1 file .jsonl. withLines=false: chỉ tính tiêu đề + số lượt (cho danh sách).
// withLines=true: dựng lại hội thoại dạng bong bóng me/ai để render lại (cho resume).
function parseFile(file, withLines) {
  const raw = fs.readFileSync(file, "utf8");
  let firstUser = "";
  let turns = 0;
  const msgs = []; // {role:'me'|'ai', text}
  let curAi = null; // gộp nhiều đoạn text assistant liền nhau trong 1 lượt thành 1 bong bóng

  for (const row of raw.split("\n")) {
    const t = row.trim();
    if (!t) continue;
    let ev;
    try { ev = JSON.parse(t); } catch { continue; }

    if (ev.type === "user") {
      if (isSyntheticUser(ev)) continue;
      const content = ev.message?.content;
      const prompt = userPromptText(content);
      if (prompt) {
        turns++;
        if (!firstUser) firstUser = prompt;
        if (withLines) { curAi = null; msgs.push({ role: "me", text: prompt }); }
      }
      continue;
    }

    if (ev.type === "assistant" && withLines) {
      const content = Array.isArray(ev.message?.content) ? ev.message.content : [];
      for (const c of content) {
        if (c.type === "text" && typeof c.text === "string") {
          const visible = stripSuggest(c.text);
          if (!visible) continue;
          // Nhiều đoạn text rời (bị tool call chen giữa) gộp vào 1 bong bóng — phải chèn dòng
          // trống, không thì 2 câu dính liền nhau ("…ạ.Đang cho…") và markdown vỡ.
          if (!curAi) { curAi = { role: "ai", text: visible }; msgs.push(curAi); }
          else curAi.text += "\n\n" + visible;
        }
      }
    }
  }

  const title = (firstUser || "(phiên trống)").slice(0, 120);
  return { title, turns, msgs };
}

// Liệt kê phiên của 1 project, mới → cũ. Bỏ phiên rỗng (không có lượt hỏi nào).
// Gộp mọi account trên máy: một phiên đã chạy tiếp bằng account khác (do hết quota) vẫn phải nằm
// trong danh sách, và lấy đúng bản mtime mới nhất. Cùng id ở 2 account → giữ bản mới hơn.
export function listSessions(project) {
  const dirs = listAccounts().map((acct) => ({ acct, dir: projectDirIn(accountHome(acct), project) }));
  // Account đang chạy phải có mặt kể cả khi listAccounts() không thấy .credentials.json của nó.
  if (!dirs.some((d) => d.dir === projectDir(project))) {
    dirs.push({ acct: "current", dir: projectDir(project) });
  }
  const best = new Map(); // id → { id, title, mtime, turns, acct }
  for (const { acct, dir } of dirs) {
    let files;
    try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl")); } catch { continue; }
    for (const f of files) {
      const id = f.replace(/\.jsonl$/, "");
      if (!UUID_RE.test(id)) continue;
      const full = path.join(dir, f);
      try {
        const { mtimeMs } = fs.statSync(full);
        const mtime = Math.round(mtimeMs);
        const prev = best.get(id);
        if (prev && prev.mtime >= mtime) continue;
        const { title, turns } = parseFile(full, false);
        if (turns === 0) continue;
        best.set(id, { id, title, mtime, turns, acct });
      } catch { /* bỏ file lỗi */ }
    }
  }
  return [...best.values()].sort((a, b) => b.mtime - a.mtime);
}

// ─── Phiên nằm rải ở nhiều account ─────────────────────────────────────────────────────────────
// Sau một lần chuyển account (hết quota), lượt mới của phiên được ghi vào .jsonl của account MỚI,
// còn account cũ giữ bản cũ hơn. Nên "bản đúng" của một phiên = bản mtime mới nhất trong các
// account, chứ không phải bản ở account đang chạy.

// Mọi bản sao của 1 phiên trên máy, mới → cũ.
// Nếu thư mục projects/ của 2 account được symlink vào nhau (dùng chung transcript, không copy) thì
// cùng một file hiện ra ở nhiều account → gộp lại theo realpath để không đếm trùng.
export function sessionCopies(project, id) {
  if (!UUID_RE.test(id)) return [];
  const out = [];
  const seen = new Set();
  for (const acct of listAccounts()) {
    const file = path.join(projectDirIn(accountHome(acct), project), `${id}.jsonl`);
    try {
      const { mtimeMs } = fs.statSync(file);
      const real = fs.realpathSync(file);
      if (seen.has(real)) continue;
      seen.add(real);
      out.push({ acct, file, real, dir: path.dirname(file), mtime: Math.round(mtimeMs) });
    } catch { /* account này không có phiên đó */ }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

// Đảm bảo account `acct` có bản MỚI NHẤT của phiên → resume bằng account đó là chạy tiếp đúng chỗ.
// Copy cả thư mục <id>/ (tool-results tràn ra file) nếu có. Trả về:
//   { ok, action: "already-newest" | "copied" | "missing", from }
export function ensureSessionInAccount(project, id, acct) {
  if (!UUID_RE.test(id)) return { ok: false, action: "missing" };
  const copies = sessionCopies(project, id);
  if (!copies.length) return { ok: false, action: "missing" };
  const newest = copies[0];
  if (newest.acct === acct) return { ok: true, action: "already-newest", from: acct };

  const dstDir = projectDirIn(accountHome(acct), project);
  const dstFile = path.join(dstDir, `${id}.jsonl`);
  // Hai account dùng chung thư mục qua symlink → cùng một file, không có gì phải copy (và tự copy
  // lên chính mình vừa vô nghĩa vừa làm mtime nhảy, khiến logic "bản mới nhất" nhiễu).
  try {
    if (fs.realpathSync(dstFile) === newest.real) return { ok: true, action: "already-newest", from: acct };
  } catch { /* đích chưa có file → copy như thường */ }
  try {
    fs.mkdirSync(dstDir, { recursive: true });
    fs.copyFileSync(newest.file, dstFile);
    const extras = path.join(newest.dir, id);
    if (fs.existsSync(extras)) {
      fs.cpSync(extras, path.join(dstDir, id), { recursive: true, force: true });
    }
    return { ok: true, action: "copied", from: newest.acct };
  } catch (e) {
    console.warn("[sessions] copy phiên", id, "sang", acct, "lỗi:", e.message);
    return { ok: false, action: "missing", from: newest.acct };
  }
}

// Đọc hội thoại 1 phiên → mảng {role, text} để render lại. Cap để tránh trả quá nặng.
// Đọc bản mtime mới nhất trong các account: phiên đã từng chạy tiếp ở account khác thì console
// vẫn hiện đủ lượt, không mất phần làm ở account đó.
export function readSessionMessages(project, id, cap = 400) {
  if (!UUID_RE.test(id)) return null;
  const newest = sessionCopies(project, id)[0];
  const file = newest ? newest.file : path.join(projectDir(project), `${id}.jsonl`);
  if (!fs.existsSync(file)) return null;
  const { msgs } = parseFile(file, true);
  return msgs.slice(-cap).map((m) => ({ ...m, status: "", errors: [] }));
}

// Xoá vĩnh viễn file .jsonl của 1 phiên. Trả về true nếu đã xoá (hoặc file vốn không tồn tại).
export function deleteSession(project, id) {
  if (!UUID_RE.test(id)) return false;
  const file = path.join(projectDir(project), `${id}.jsonl`);
  try { fs.rmSync(file, { force: true }); return true; } catch { return false; }
}
