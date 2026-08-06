// PM2 ecosystem for the Next.js AI agent UI (this app only).
//   cd ui-next && pm2 start ecosystem.config.js     # start the app
//   pm2 restart ai-agent-ui-next                    # apply changes (build first!)
//   pm2 logs ai-agent-ui-next
//   pm2 save && pm2 startup                         # persist across reboots
//
// Build before (re)starting:  cd ui-next && npm run build   (bakes NEXT_PUBLIC_BASE_PATH=/ai)
// Exposing to the internet is NOT done here — a shared gateway handles ngrok for all apps:
//   ~/IdeaProjects/gateway (1 Caddy + 1 ngrok, routes /ai → this app, /* → elearning, ...).
// This app only needs to run on PORT; the gateway proxies /ai into it.
// Config in ui-next/.env: PORT, HOSTNAME, NEXT_PUBLIC_BASE_PATH, UI_BASIC_AUTH.

const path = require("path");

try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch {}

const PORT = process.env.PORT || "5000";
const HOST = process.env.HOSTNAME || "127.0.0.1";

// Chọn Claude account cho agent do UI spawn — đặt CLAUDE_ACCOUNT trong ui-next/.env:
//   (trống) | default → account mặc định  → UNSET CLAUDE_CONFIG_DIR
//   account2 / account3 → ~/.claude-account2 | ~/.claude-account3
//   /đường/dẫn/tuyệt/đối → dùng nguyên
//
// ⚠️ Account mặc định = UNSET, KHÔNG PHẢI `~/.claude`. Lý do: `CLAUDE_CONFIG_DIR` đổi luôn chỗ CLI
// đọc file config thành `$CLAUDE_CONFIG_DIR/.claude.json`. Config THẬT của account mặc định lại nằm
// ở `~/.claude.json` (NGOÀI dir, đủ 5 MCP), còn `~/.claude/.claude.json` chỉ là file stub với
// mcpServers = { atlassian } → set `~/.claude` là agent MẤT mysql_207 / gsheets / figma. Các dir
// account2/3 thì tự chứa `.claude.json` đầy đủ nên trỏ vào chúng chạy bình thường.
//
// Luôn set/delete tường minh: env spread từ pm2 daemon, mà daemon kế thừa từ terminal đã start nó
// (có thể đang trỏ account cũ/đã chết) — không xoá tay thì giá trị lạ lọt vào.
const HOME = process.env.HOME;
const ACCOUNT = (process.env.CLAUDE_ACCOUNT || "").trim();
const CLAUDE_DIR =
  !ACCOUNT || ACCOUNT === "default"
    ? ""
    : path.isAbsolute(ACCOUNT)
      ? ACCOUNT
      : path.join(HOME, `.claude-${ACCOUNT.replace(/^\.?claude-/, "")}`);

if (CLAUDE_DIR === path.join(HOME, ".claude")) {
  console.warn(
    "[ecosystem] CLAUDE_ACCOUNT trỏ vào ~/.claude — dir này chỉ có file stub 1 MCP server.\n" +
      "            Bỏ trống CLAUDE_ACCOUNT để dùng account mặc định. Đang unset CLAUDE_CONFIG_DIR."
  );
}

const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || "production",
  PORT,
  HOSTNAME: HOST,
  // The UI spawns `claude` by name; pm2's PATH often lacks ~/.local/bin where it lives.
  PATH: `${HOME}/.local/bin:${process.env.PATH || ""}`,
};
if (CLAUDE_DIR && CLAUDE_DIR !== path.join(HOME, ".claude")) {
  env.CLAUDE_CONFIG_DIR = CLAUDE_DIR;
} else {
  delete env.CLAUDE_CONFIG_DIR;
}

module.exports = {
  apps: [
    {
      name: "ai-agent-ui-next",
      script: "./node_modules/next/dist/bin/next",
      args: "start",
      interpreter: "node",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      // Đổi env phải apply bằng `pm2 restart ecosystem.config.js --update-env`
      // (restart theo TÊN process sẽ giữ env cũ).
      env,
      out_file: path.join(__dirname, "logs/ui-out.log"),
      error_file: path.join(__dirname, "logs/ui-error.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
