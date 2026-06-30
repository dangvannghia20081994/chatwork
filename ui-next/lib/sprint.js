// Sprint burndown "negative hours" (giờ âm) — SINGLE SOURCE of the logic, shared by:
//   - the web tool  : app/api/sprint/route.js + app/sprint/page.jsx
//   - the CLI skill : ../../.claude/skills/sprint-negative-hours/compare.js (dynamic-imports this file)
//
// Rule (đúng cách team Rezil làm): chọn 1 cột ngày (mặc định hôm nay); với mỗi ticket nếu
// Actual có dữ liệu (>0) VÀ Actual > Expect thì phần vượt = Actual − Expect là "giờ âm".
// Gom theo người (Assignee) → danh sách ticket âm + tổng giờ âm.
//
// File burndown: các sheet cùng layout, header ở DÒNG 1:
//   A:Type B:Team C:Parent ID D:ID E:Category F:Note G:Estimate H:Debuffer I:Assignee J:Start
//   K..→ các cột NGÀY (header = số serial Excel). Chỉ dùng 2 sheet: Expect (kế hoạch) & Actual (thực tế).
import * as XLSX from "xlsx";

const COL_ID = 3; // cột D
const COL_ASSIGNEE = 8; // cột I

// --- date <-> Excel serial (hệ 1900) ---
export function dateToSerial(y, m, d) {
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
}
export function serialToISO(s) {
  return new Date(Date.UTC(1899, 11, 30) + s * 86400000).toISOString().slice(0, 10);
}
export function todaySerial(now = new Date()) {
  return dateToSerial(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function mkErr(msg, status = 400) {
  return Object.assign(new Error(msg), { status });
}
function dateColumns(header) {
  const cols = [];
  for (let i = 0; i < header.length; i++) {
    const n = Number(header[i]);
    if (Number.isFinite(n) && n > 40000 && n < 60000) cols.push({ idx: i, serial: n });
  }
  return cols;
}
function indexByID(rows, colIdx) {
  const m = new Map();
  for (const r of rows.slice(1)) {
    const id = r[COL_ID] == null ? "" : String(r[COL_ID]).trim();
    if (!id) continue;
    m.set(id, { v: r[colIdx], assignee: r[COL_ASSIGNEE] });
  }
  return m;
}
const num = (v) => (v == null || v === "" ? 0 : Number(v));
const hasData = (v) => v != null && v !== "" && Number(v) > 0;

// 0-based column index → A1 letter (0→A, 11→L, 26→AA). Layout của sheet = layout file export, nên
// index cột ngày trong file chính là cột tương ứng trên Google Sheet.
function colIndexToLetter(idx) {
  let s = "";
  for (let n = idx; n >= 0; n = Math.floor(n / 26) - 1) s = String.fromCharCode(65 + (n % 26)) + s;
  return s;
}

// Resolve which serial to compare from opts ({ serial } | { date:'YYYY-MM-DD' } | mặc định hôm nay).
function resolveSerial(opts) {
  if (opts.serial != null && !Number.isNaN(Number(opts.serial))) return Number(opts.serial);
  if (opts.date) {
    const [y, m, d] = String(opts.date).split("-").map(Number);
    return dateToSerial(y, m, d);
  }
  return todaySerial();
}

// buffer: Buffer/ArrayBuffer của file .xlsx.
// opts: { date?, serial?, all?, sheetExpect='Expect', sheetActual='Actual', fileName? }
// return: { serial, dateISO, all, people:[{name,total,tickets:[{id,day,expect,actual,over}]}], grand, sprintFromName }
export function computeNegativeHours(buffer, opts = {}) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetE = opts.sheetExpect || "Expect";
  const sheetA = opts.sheetActual || "Actual";
  if (!wb.Sheets[sheetE]) throw mkErr(`Không thấy sheet "${sheetE}" trong file.`);
  if (!wb.Sheets[sheetA]) throw mkErr(`Không thấy sheet "${sheetA}" trong file.`);

  const eRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetE], { header: 1, defval: null });
  const aRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetA], { header: 1, defval: null });
  const eHeader = eRows[0] || [];
  const aHeader = aRows[0] || [];

  const serial = resolveSerial(opts);

  let targets;
  if (opts.all) {
    targets = dateColumns(eHeader);
  } else {
    const idxE = eHeader.findIndex((c) => Number(c) === serial);
    if (idxE < 0) {
      const avail = dateColumns(eHeader).map((c) => serialToISO(c.serial)).join(", ");
      throw mkErr(
        `Ngày ${serialToISO(serial)} không có trong file. Các ngày hợp lệ: ${avail || "(không có cột ngày)"}`
      );
    }
    targets = [{ idx: idxE, serial }];
  }

  const people = {};
  for (const t of targets) {
    const idxA = aHeader.findIndex((c) => Number(c) === t.serial);
    if (idxA < 0) continue;
    const E = indexByID(eRows, t.idx);
    const A = indexByID(aRows, idxA);
    for (const [id, a] of A) {
      const e = E.get(id) || { v: null };
      const ev = num(e.v);
      const av = num(a.v);
      if (hasData(a.v) && av > ev) {
        const over = +(av - ev).toFixed(2);
        const who = (a.assignee && String(a.assignee).trim()) || "(?)";
        if (!people[who]) people[who] = { name: who, total: 0, tickets: [] };
        people[who].tickets.push({
          id,
          day: serialToISO(t.serial),
          expect: e.v == null ? 0 : e.v,
          actual: a.v,
          over,
        });
        people[who].total = +(people[who].total + over).toFixed(2);
      }
    }
  }

  const list = Object.values(people).sort((x, y) => y.total - x.total);
  const grand = +list.reduce((s, p) => s + p.total, 0).toFixed(2);
  const sprintFromName = opts.fileName
    ? ((String(opts.fileName).match(/Sprint\s*(\d+)/i) || [])[1] || null)
    : null;
  // Cột ngày trên Google Sheet (chỉ với 1 ngày cụ thể; chế độ --all gồm nhiều cột → null).
  const colLetter = !opts.all && targets.length === 1 ? colIndexToLetter(targets[0].idx) : null;

  return { serial, dateISO: serialToISO(serial), all: !!opts.all, people: list, grand, sprintFromName, colLetter };
}

function fmtDM(serial) {
  const [, m, d] = serialToISO(serial).split("-");
  return `${d}/${m}`;
}

// Gắn anchor cột ngày vào link Google Sheet: ...#gid=123 → ...#gid=123&range=L:L. Bỏ range cũ (nếu
// có) để chạy lại không bị chồng; không có fragment thì thêm bằng '#'.
function linkWithRange(link, colLetter) {
  if (!link || !colLetter) return link;
  const base = link.replace(/[&#]range=[A-Za-z]+:[A-Za-z]+/i, "");
  const sep = base.includes("#") ? "&" : "#";
  return `${base}${sep}range=${colLetter}:${colLetter}`;
}

// result: từ computeNegativeHours. meta: { to:'id:Tên', sprint, link }.
// → block Chatwork sẵn để copy ([To:]…[info]…[/info]); chừa chỗ "(lý do...)" để điền tay.
export function toChatwork(result, meta = {}) {
  const to = meta.to == null ? "6040320:Le Ngoc Chien" : meta.to;
  const sprint = meta.sprint || result.sprintFromName;
  const L = [];
  if (to) {
    const [id, ...nm] = String(to).split(":");
    L.push(`[To:${id}]${nm.join(":")}`.trimEnd());
  }
  const dayLabel = result.all ? "cả sprint" : `ngày ${fmtDM(result.serial)}`;
  const title = `📉 Report Actual ${sprint ? ` Sprint ${sprint}` : ""} — ${dayLabel}`;
  L.push("Em gửi Report Actual Sprint ạ");
  L.push(`[info][title]${title}[/title]`);
  L.push(`🔗 ${meta.link ? linkWithRange(meta.link, result.colLetter) : "<dán link Google Sheet ở đây>"}`);
  L.push("[hr]");
  for (const p of result.people) {
    L.push(`👤 ${p.name} — âm ${p.total}h`);
    for (const t of p.tickets) {
      const day = result.all ? `[${t.day}] ` : "";
      L.push(`  + ${day}${t.id} (Expect ${t.expect} / Actual ${t.actual}) — (lý do...)`);
    }
  }
  if (!result.people.length) {
    L.push("✅ Các ticket đã keep plan");
  }
  L.push("[/info]");
  return L.join("\n");
}
