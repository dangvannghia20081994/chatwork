#!/usr/bin/env node
/**
 * Sprint negative-hours report (CLI).
 * Vỏ mỏng: toàn bộ logic nằm ở ui-next/lib/sprint.js (dùng chung với web tool /sprint).
 *
 * Usage:
 *   node compare.js [--file "<path.xlsx>"] [--date YYYY-MM-DD | --serial N | --all]
 *                   [--chatwork] [--to "id:Tên"] [--sprint NN] [--link <url>] [--json]
 * Mặc định: file .xlsx mới nhất trong ui-next/.ai-uploads (hoặc .ai-uploads); ngày = hôm nay.
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

// Lib dùng chung là ESM nhưng ui-next/package.json không khai "type":"module" (giữ CJS cho
// next.config/postcss/ecosystem). Node phát cảnh báo MODULE_TYPELESS_PACKAGE_JSON — vô hại, ẩn đi.
const _emitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, ...rest) => {
  const code = (rest[0] && rest[0].code) || rest[1];
  if (code === "MODULE_TYPELESS_PACKAGE_JSON" || /MODULE_TYPELESS_PACKAGE_JSON/.test(String(warning))) return;
  return _emitWarning(warning, ...rest);
};

// --- args ---
const argv = process.argv.slice(2);
const opt = {
  file: null, date: null, serial: null, all: false,
  chatwork: false, to: undefined, sprint: undefined, link: undefined,
};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--all") opt.all = true;
  else if (a === "--chatwork" || a === "--cw") opt.chatwork = true;
  else if (a === "--file") opt.file = argv[++i];
  else if (a === "--date") opt.date = argv[++i];
  else if (a === "--serial") opt.serial = Number(argv[++i]);
  else if (a === "--to") opt.to = argv[++i];
  else if (a === "--sprint") opt.sprint = argv[++i];
  else if (a === "--link") opt.link = argv[++i];
  else if (a.startsWith("--file=")) opt.file = a.slice(7);
  else if (a.startsWith("--date=")) opt.date = a.slice(7);
  else if (a.startsWith("--serial=")) opt.serial = Number(a.slice(9));
  else if (a.startsWith("--to=")) opt.to = a.slice(5);
  else if (a.startsWith("--sprint=")) opt.sprint = a.slice(9);
  else if (a.startsWith("--link=")) opt.link = a.slice(7);
  else if (!a.startsWith("-") && !opt.file) opt.file = a;
}

// Repo root suy từ vị trí skill: .claude/skills/sprint-negative-hours/ → lên 3 cấp.
const REPO_ROOT = path.resolve(__dirname, "../../..");

// --- resolve newest upload nếu không truyền --file ---
function newestUpload() {
  const dirs = [
    path.join(REPO_ROOT, "ui-next/.ai-uploads"),
    path.join(REPO_ROOT, ".ai-uploads"),
  ];
  let best = null;
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (!/\.(xlsx|xls|xlsm|xlsb)$/i.test(f)) continue;
      const full = path.join(d, f);
      const m = fs.statSync(full).mtimeMs;
      if (!best || m > best.m) best = { full, m };
    }
  }
  return best && best.full;
}

(async () => {
  // nạp lib dùng chung (ESM) — bare import "xlsx" trong lib tự resolve từ ui-next/node_modules
  const libCandidates = [
    path.join(REPO_ROOT, "ui-next/lib/sprint.js"),
  ];
  let lib = null;
  for (const p of libCandidates) {
    if (!fs.existsSync(p)) continue;
    try { lib = await import(pathToFileURL(p).href); break; } catch (e) { var lastErr = e; }
  }
  if (!lib) {
    console.error("Không nạp được ui-next/lib/sprint.js.", (typeof lastErr !== "undefined" && lastErr.message) || "");
    console.error("Nếu thiếu 'xlsx': cd ui-next && npm i xlsx");
    process.exit(1);
  }
  const { computeNegativeHours, toChatwork } = lib;

  const file = opt.file || newestUpload();
  if (!file || !fs.existsSync(file)) {
    console.error("Không tìm thấy file Excel. Truyền --file \"<path>\".");
    process.exit(1);
  }

  let result;
  try {
    result = computeNegativeHours(fs.readFileSync(file), {
      date: opt.date || undefined,
      serial: opt.serial != null && !Number.isNaN(opt.serial) ? opt.serial : undefined,
      all: opt.all,
      fileName: path.basename(file),
    });
  } catch (e) {
    console.error("Lỗi:", e.message);
    process.exit(1);
  }

  if (opt.chatwork) {
    console.log(toChatwork(result, { to: opt.to, sprint: opt.sprint, link: opt.link }));
  } else {
    const scope = result.all ? "CẢ SPRINT (mọi ngày)" : `ngày ${result.dateISO} (serial ${result.serial})`;
    console.log(`\n=== GIỜ ÂM (Actual > Expect) — ${scope} ===`);
    console.log(`File: ${path.basename(file)}\n`);
    for (const p of result.people) {
      console.log(`### ${p.name} — tổng âm: ${p.total}h`);
      for (const t of p.tickets) {
        const day = result.all ? `[${t.day}] ` : "";
        console.log(`   - ${day}${t.id}: Expect ${t.expect} / Actual ${t.actual}  => +${t.over}h`);
      }
      console.log("");
    }
    if (!result.people.length) console.log("(Không có ticket nào Actual > Expect.)\n");
    console.log(`TỔNG: ${result.grand}h vượt kế hoạch — ${result.people.length} người có ticket âm.`);
  }

  if (argv.includes("--json")) {
    console.log("\n---JSON---");
    console.log(JSON.stringify(result, null, 2));
  }
})();
