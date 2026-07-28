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
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || "production",
        PORT,
        HOSTNAME: HOST,
        // The UI spawns `claude` by name; pm2's PATH often lacks ~/.local/bin where it lives.
        PATH: `${process.env.HOME}/.local/bin:${process.env.PATH || ""}`,
        // Máy có nhiều Claude account (claude/claude2/claude3 ↔ ~/.claude*, chọn qua
        // CLAUDE_CONFIG_DIR). Pin cứng ~/.claude (account2 đã chết) để không phụ thuộc
        // terminal start pm2. Đổi giá trị này phải restart bằng `pm2 restart ecosystem.config.js
        // --update-env`, restart theo tên process sẽ giữ env cũ.
        CLAUDE_CONFIG_DIR: `${process.env.HOME}/.claude`,
      },
      out_file: path.join(__dirname, "logs/ui-out.log"),
      error_file: path.join(__dirname, "logs/ui-error.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
