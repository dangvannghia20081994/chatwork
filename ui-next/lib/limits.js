// Live rate-limit usage (current 5h session + weekly), same data as Claude Code's /usage panel.
// Calls GET https://api.anthropic.com/api/oauth/usage with the OAuth token from
// ~/.claude/.credentials.json. Endpoint + fields discovered from the claude CLI bundle
// (fetchUtilization). Node runtime only; never exposed to the client.
import fs from "fs";
import path from "path";
import os from "os";

const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";

function readCreds() {
  const p = path.join(os.homedir(), ".claude", ".credentials.json");
  const d = JSON.parse(fs.readFileSync(p, "utf8"));
  const o = d.claudeAiOauth || {};
  return { token: o.accessToken || "", tier: o.rateLimitTier || "", expiresAt: o.expiresAt || 0 };
}

// Format a reset timestamp → "DD/MM HH:MM (sau Xh Ym)" in local time.
function fmtReset(iso) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const when = `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    let ms = d.getTime() - now.getTime();
    if (ms < 0) return `${when} (đã reset)`;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    let rel;
    if (h >= 48) rel = `sau ${Math.floor(h / 24)} ngày ${h % 24}h`;
    else if (h > 0) rel = `sau ${h}h${pad(m)}m`;
    else rel = `sau ${m} phút`;
    return `${when} (${rel})`;
  } catch {
    return String(iso);
  }
}

function bar(pct) {
  const n = Math.max(0, Math.min(100, Math.round(pct)));
  const filled = Math.round(n / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

// Rows to render (only those present/non-null in the response).
const ROWS = [
  ["five_hour", "Phiên 5h"],
  ["seven_day", "Tuần · chung"],
  ["seven_day_opus", "Tuần · Opus"],
  ["seven_day_sonnet", "Tuần · Sonnet"],
];

export async function buildLimitsReport() {
  let creds;
  try {
    creds = readCreds();
  } catch (e) {
    return "🚦 Giới hạn: không đọc được ~/.claude/.credentials.json (" + e.message + ")";
  }
  if (!creds.token) return "🚦 Giới hạn: chưa đăng nhập Claude (thiếu OAuth token).";

  let res, data;
  try {
    res = await fetch(USAGE_URL, {
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "anthropic-beta": "oauth-2025-04-20",
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    return "🚦 Giới hạn: lỗi gọi API (" + e.message + ").";
  }
  if (res.status === 401) return "🚦 Giới hạn: token hết hạn — mở `claude` để đăng nhập lại rồi thử lại.";
  if (!res.ok) return `🚦 Giới hạn: API trả HTTP ${res.status}.`;
  try {
    data = await res.json();
  } catch (e) {
    return "🚦 Giới hạn: không parse được phản hồi (" + e.message + ").";
  }

  const L = [];
  L.push("🚦 Giới hạn sử dụng (live · Anthropic)" + (creds.tier ? ` · gói ${creds.tier}` : ""));
  for (const [key, label] of ROWS) {
    const v = data[key];
    if (!v || typeof v.utilization !== "number") continue;
    const pct = v.utilization;
    L.push(`  ${label.padEnd(14)} ${bar(pct)} ${String(Math.round(pct)).padStart(3)}%  · reset ${fmtReset(v.resets_at)}`);
  }
  if (L.length === 1) L.push("  (không có dữ liệu giới hạn)");

  const ex = data.extra_usage;
  if (ex && ex.is_enabled) {
    L.push(`  Extra usage: bật${ex.utilization != null ? ` (${Math.round(ex.utilization)}%)` : ""}`);
  }
  return L.join("\n");
}
