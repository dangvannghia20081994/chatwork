// Claude usage report — reads token usage straight from Claude Code transcripts
// (~/.claude/projects/**/*.jsonl). No network, no extra deps. Ported from ui/server.js.
import fs from "fs";
import path from "path";
import os from "os";

// Public list prices (USD per 1,000,000 tokens). Update if Anthropic changes pricing.
const PRICES = {
  opus: { in: 15, out: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  sonnet: { in: 3, out: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  haiku: { in: 1, out: 5, cacheWrite: 1.25, cacheRead: 0.1 },
};
function priceFor(model) {
  const m = (model || "").toLowerCase();
  if (m.includes("opus")) return PRICES.opus;
  if (m.includes("sonnet")) return PRICES.sonnet;
  if (m.includes("haiku")) return PRICES.haiku;
  return null;
}

function listTranscripts() {
  const root = path.join(os.homedir(), ".claude", "projects");
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const dir of fs.readdirSync(root)) {
    const sub = path.join(root, dir);
    let st;
    try { st = fs.statSync(sub); } catch { continue; }
    if (!st.isDirectory()) continue;
    for (const f of fs.readdirSync(sub)) if (f.endsWith(".jsonl")) out.push(path.join(sub, f));
  }
  return out;
}

function dayKey(ts) {
  try { return new Date(ts).toLocaleDateString("sv"); } catch { return ""; }
}

export function readUsageData() {
  const files = listTranscripts();
  const seen = new Set();
  const byModel = {};
  const today = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0, cost: 0, turns: 0 };
  const todayKey = new Date().toLocaleDateString("sv");
  let totalCost = 0, firstDay = "", lastDay = "";

  for (const file of files) {
    let raw;
    try { raw = fs.readFileSync(file, "utf8"); } catch { continue; }
    for (const line of raw.split("\n")) {
      if (!line || !line.includes('"usage"')) continue;
      let evt;
      try { evt = JSON.parse(line); } catch { continue; }
      const msg = evt && evt.message;
      const u = msg && msg.usage;
      if (!u || evt.type !== "assistant") continue;
      const id = (msg.id || "") + "|" + (evt.requestId || "");
      if (id !== "|" && seen.has(id)) continue;
      seen.add(id);

      const input = u.input_tokens || 0;
      const output = u.output_tokens || 0;
      const cacheWrite = u.cache_creation_input_tokens || 0;
      const cacheRead = u.cache_read_input_tokens || 0;
      const p = priceFor(msg.model);
      const cost = p
        ? (input * p.in + output * p.out + cacheWrite * p.cacheWrite + cacheRead * p.cacheRead) / 1e6
        : 0;

      const model = msg.model || "unknown";
      const b = byModel[model] || (byModel[model] = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0, cost: 0, turns: 0 });
      b.input += input; b.output += output; b.cacheWrite += cacheWrite; b.cacheRead += cacheRead; b.cost += cost; b.turns++;
      totalCost += cost;

      const d = dayKey(evt.timestamp);
      if (d) { if (!firstDay || d < firstDay) firstDay = d; if (!lastDay || d > lastDay) lastDay = d; }
      if (d === todayKey) {
        today.input += input; today.output += output; today.cacheWrite += cacheWrite;
        today.cacheRead += cacheRead; today.cost += cost; today.turns++;
      }
    }
  }
  return { byModel, today, totalCost, sessions: files.length, firstDay, lastDay, todayKey };
}

function fmtTok(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}
const fmtUsd = (n) => "$" + n.toFixed(2);

export function buildUsageReport() {
  let d;
  try { d = readUsageData(); } catch (e) { return "⚠ Không đọc được usage: " + e.message; }
  const L = [];
  L.push("📊 Claude usage (ước tính — đọc local từ ~/.claude/projects)");
  L.push("");
  const t = d.today;
  L.push(`Hôm nay (${d.todayKey}) · ${t.turns} lượt:`);
  L.push(`  Token: in ${fmtTok(t.input)} · out ${fmtTok(t.output)} · cache-w ${fmtTok(t.cacheWrite)} · cache-r ${fmtTok(t.cacheRead)}`);
  L.push(`  Cost ước tính: ${fmtUsd(t.cost)}`);
  L.push("");
  const span = d.firstDay ? `${d.firstDay} → ${d.lastDay}` : "—";
  L.push(`Tổng cộng (${d.sessions} sessions · ${span}):`);
  const models = Object.entries(d.byModel).sort((a, b) => b[1].cost - a[1].cost);
  if (!models.length) {
    L.push("  (chưa có dữ liệu usage)");
  } else {
    for (const [model, b] of models) {
      const name = model.replace(/^claude-/, "");
      L.push(`  ${name.padEnd(16)} in ${fmtTok(b.input)} · out ${fmtTok(b.output)} · cache-r ${fmtTok(b.cacheRead)} → ${fmtUsd(b.cost)}`);
    }
  }
  L.push(`  Tổng cost ước tính: ${fmtUsd(d.totalCost)}`);
  L.push("");
  L.push("* Giá public/1M token (Opus 15/75, Sonnet 3/15, Haiku 1/5; cache-w 1.25× in, cache-r 0.1× in).");
  L.push("* Chỉ tính transcript trên máy này; không phải hoá đơn chính thức.");
  return L.join("\n");
}
