// Đọc danh sách + nội dung các phiên chat của Claude CLI cho từng project.
// Claude lưu mỗi phiên thành 1 file .jsonl trong CLAUDE_CONFIG_DIR/projects/<cwd-encoded>/.
// Mỗi project (rezil/story/film/free) có cwd riêng → thư mục phiên riêng, nên MỌI hàm ở đây
// nhận `project` và tự resolve cwd qua resolveProject. Node runtime, chỉ dùng ở server (fs).
import fs from "node:fs";
import path from "node:path";
import { claudeHome, resolveProject, normalizeProject } from "./config.js";

// Thư mục .jsonl của 1 project. Claude mã hoá CWD bằng cách thay mọi ký tự [/.] → '-'
// (vd /home/nghiadv/IdeaProjects/rezil-esms → -home-nghiadv-IdeaProjects-rezil-esms).
function projectDir(project) {
  const { cwd } = resolveProject(normalizeProject(project));
  const enc = cwd.replace(/[/.]/g, "-");
  return path.join(claudeHome(), "projects", enc);
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
export function listSessions(project) {
  const dir = projectDir(project);
  let files;
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl")); } catch { return []; }
  const out = [];
  for (const f of files) {
    const id = f.replace(/\.jsonl$/, "");
    if (!UUID_RE.test(id)) continue;
    const full = path.join(dir, f);
    try {
      const { mtimeMs } = fs.statSync(full);
      const { title, turns } = parseFile(full, false);
      if (turns === 0) continue;
      out.push({ id, title, mtime: Math.round(mtimeMs), turns });
    } catch { /* bỏ file lỗi */ }
  }
  out.sort((a, b) => b.mtime - a.mtime);
  return out;
}

// Đọc hội thoại 1 phiên → mảng {role, text} để render lại. Cap để tránh trả quá nặng.
export function readSessionMessages(project, id, cap = 400) {
  if (!UUID_RE.test(id)) return null;
  const file = path.join(projectDir(project), `${id}.jsonl`);
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
