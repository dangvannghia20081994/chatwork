// Live rate-limit usage (current 5h session + weekly), same data as Claude Code's /usage panel.
// Calls GET https://api.anthropic.com/api/oauth/usage with the OAuth token from
// ~/.claude/.credentials.json. Endpoint + fields discovered from the claude CLI bundle
// (fetchUtilization). Node runtime only; never exposed to the client.
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { claudeHome, accountHome, listAccounts } from "./config.js";

const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";

function readCreds(home = claudeHome()) {
  const p = path.join(home, ".credentials.json");
  const d = JSON.parse(fs.readFileSync(p, "utf8"));
  const o = d.claudeAiOauth || {};
  return { token: o.accessToken || "", tier: o.rateLimitTier || "", expiresAt: o.expiresAt || 0 };
}

// The stored accessToken expires every few hours; only the CLI refreshes it (nobody runs `claude`
// on this box for days while the UI serves /usage over ngrok), so the token goes stale and the API
// answers 401.
//
// `claude auth status` does NOT refresh it — checked with `unshare -rn` (no network at all): it
// still prints the full status, i.e. it only reads .credentials.json. The rewrite happens as a side
// effect of a REAL CLI turn, so force the cheapest one possible (haiku, 1 lượt, prompt 1 từ) and let
// the CLI keep owning the secret instead of doing the OAuth refresh dance — and rotating the refresh
// token — in here. Costs ~15s, only on the expired-token path.
const PING_ARGV = ["-p", "ok", "--model", "haiku", "--max-turns", "1", "--output-format", "text"];

function refreshCredsViaCli(home = claudeHome()) {
  return new Promise((resolve) => {
    let done = false;
    const fin = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    let child;
    try {
      child = spawn("claude", PING_ARGV, {
        env: { ...process.env, CLAUDE_CONFIG_DIR: home },
        stdio: "ignore",
      });
    } catch (e) {
      console.warn("[limits] không spawn được claude để refresh token:", e.message);
      return fin();
    }
    const t = setTimeout(() => {
      console.warn("[limits] claude refresh ping quá 60s — kill");
      try {
        child.kill("SIGKILL");
      } catch {}
      fin();
    }, 60000);
    child.on("close", () => {
      clearTimeout(t);
      fin();
    });
    child.on("error", (e) => {
      clearTimeout(t);
      console.warn("[limits] claude refresh ping lỗi:", e.message);
      fin();
    });
  });
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

function fetchUsage(token) {
  return fetch(USAGE_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
      "anthropic-beta": "oauth-2025-04-20",
    },
    signal: AbortSignal.timeout(15000),
  });
}

export async function buildLimitsReport() {
  const readOrFail = () => {
    try {
      return { creds: readCreds() };
    } catch (e) {
      return { err: "🚦 Giới hạn: không đọc được " + path.join(claudeHome(), ".credentials.json") + " (" + e.message + ")" };
    }
  };

  let r = readOrFail();
  if (r.err) return r.err;
  let creds = r.creds;

  // Refresh up front when the stored token is (nearly) expired, so the usual case costs no 401.
  let refreshed = false;
  if (creds.token && creds.expiresAt && creds.expiresAt - Date.now() < 60000) {
    refreshed = true;
    const before = creds.expiresAt;
    console.warn("[limits] OAuth token hết hạn — chạy 1 lượt claude để CLI refresh");
    await refreshCredsViaCli();
    r = readOrFail();
    if (r.err) return r.err;
    creds = r.creds;
    console.warn(
      creds.expiresAt > before
        ? "[limits] refresh OK — token mới hết hạn " + new Date(creds.expiresAt).toISOString()
        : "[limits] refresh KHÔNG đổi được token (expiresAt vẫn " + before + ")"
    );
  }
  if (!creds.token) return "🚦 Giới hạn: chưa đăng nhập Claude (thiếu OAuth token).";

  let res, data;
  try {
    res = await fetchUsage(creds.token);
    // Expiry we didn't predict (clock skew, token revoked server-side) → one refresh + retry.
    if (res.status === 401 && !refreshed) {
      refreshed = true;
      console.warn("[limits] API trả 401 dù token còn hạn — thử refresh qua claude CLI");
      await refreshCredsViaCli();
      r = readOrFail();
      if (r.err) return r.err;
      creds = r.creds;
      if (creds.token) res = await fetchUsage(creds.token);
    }
  } catch (e) {
    return "🚦 Giới hạn: lỗi gọi API (" + e.message + ").";
  }
  if (res.status === 401)
    return (
      "🚦 Giới hạn: token OAuth hết hạn, refresh qua claude CLI không được — trên máy chạy UI chạy:\n" +
      "  CLAUDE_CONFIG_DIR=" + claudeHome() + " claude auth login"
    );
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

// ─── Quota theo từng account (cho auto-switch khi hết quota) ────────────────────────────────────
// Chỉ 2 hạn mức được coi là "chặn cả account": phiên 5h và tuần chung. Hạn mức riêng theo model
// (seven_day_opus/sonnet) cạn KHÔNG chặn account — vẫn chạy được model còn lại.
const BINDING_ROWS = ["five_hour", "seven_day"];
const USAGE_CACHE_MS = 60000;
const usageCache = new Map(); // acct → { at, ok, headroom, tier, error }

function headroomFrom(data) {
  let worst = 0;
  for (const key of BINDING_ROWS) {
    const v = data[key];
    if (v && typeof v.utilization === "number") worst = Math.max(worst, v.utilization);
  }
  return Math.max(0, 100 - worst);
}

// Quota còn lại của 1 account, cache 60s. KHÔNG spawn claude để refresh token trong đường request
// (mất ~15s) trừ khi allowRefresh — token hết hạn thì coi như không biết (ok:false) và bỏ qua
// account đó, chứ không làm chậm chat.
export async function accountUsage(acct, { allowRefresh = false } = {}) {
  const hit = usageCache.get(acct);
  if (hit && Date.now() - hit.at < USAGE_CACHE_MS) return hit;

  const home = accountHome(acct);
  const put = (v) => {
    const rec = { acct, at: Date.now(), ...v };
    usageCache.set(acct, rec);
    return rec;
  };

  let creds;
  try {
    creds = readCreds(home);
  } catch (e) {
    return put({ ok: false, headroom: 0, error: "không đọc được credentials: " + e.message });
  }
  if (!creds.token) return put({ ok: false, headroom: 0, error: "chưa đăng nhập" });
  if (creds.expiresAt && creds.expiresAt - Date.now() < 60000) {
    if (!allowRefresh) return put({ ok: false, headroom: 0, error: "token hết hạn" });
    await refreshCredsViaCli(home);
    try { creds = readCreds(home); } catch { /* giữ creds cũ */ }
  }

  try {
    const res = await fetchUsage(creds.token);
    if (!res.ok) return put({ ok: false, headroom: 0, error: `HTTP ${res.status}` });
    const data = await res.json();
    return put({ ok: true, headroom: headroomFrom(data), tier: creds.tier });
  } catch (e) {
    return put({ ok: false, headroom: 0, error: e.message });
  }
}

// Một run vừa báo hết quota → ghi nhận ngay, khỏi phải chờ API xác nhận lượt sau.
export function markAccountExhausted(acct) {
  usageCache.set(acct, { acct, at: Date.now(), ok: true, headroom: 0, error: "run báo hết quota" });
}

// Account còn dư nhiều nhất (đã trừ `exclude`), hoặc null nếu không có account nào còn dư đáng kể.
export async function pickAccountWithQuota({ exclude = [], minHeadroom = 3 } = {}) {
  const cands = listAccounts().filter((a) => !exclude.includes(a));
  const rows = await Promise.all(cands.map((a) => accountUsage(a)));
  const usable = rows.filter((r) => r.ok && r.headroom >= minHeadroom);
  if (!usable.length) return null;
  usable.sort((a, b) => b.headroom - a.headroom);
  return usable[0];
}
