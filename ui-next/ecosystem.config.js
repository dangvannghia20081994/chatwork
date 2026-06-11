// PM2 ecosystem config for the Next.js AI agent UI + ngrok tunnel.
// Lives in ui-next/. Run from here:
//   cd ui-next && pm2 start ecosystem.config.js     # start UI + ngrok
//   pm2 restart ai-agent-ui-next                    # apply Next changes (build first!)
//   pm2 logs ai-agent-ui-next                       # tail logs
//   pm2 save && pm2 startup                         # persist across reboots
//
// Build the Next app before (re)starting it:  cd ui-next && npm run build
// Config comes from ui-next/.env (no hardcoding here): PORT, HOST, NGROK_DOMAIN, UI_BASIC_AUTH.
// After editing .env:  pm2 restart ecosystem.config.js --update-env
// Basic auth via ui-next/.env UI_BASIC_AUTH.

const path = require("path");

// Load ui-next/.env into process.env so PORT/host/domain live in ONE place (not hardcoded here).
// Real env vars override .env; soft-fail if dotenv/.env is missing.
try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch {}

const PORT = process.env.PORT || "5000";
const HOST = process.env.HOSTNAME || "127.0.0.1";
const NGROK_DOMAIN = process.env.NGROK_DOMAIN || "these-cadet-unaired.ngrok-free.dev";

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
        // Inherit the loaded env (UI_BASIC_AUTH etc.), then pin the operational vars.
        ...process.env,
        // next start reads PORT/HOSTNAME from env (no -p/-H flags needed).
        // Reuse the consts above so Next + ngrok share ONE port/host.
        NODE_ENV: process.env.NODE_ENV || "production",
        PORT,
        HOSTNAME: HOST,
        // The UI spawns `claude` by name; pm2's PATH often lacks ~/.local/bin where it lives.
        PATH: `${process.env.HOME}/.local/bin:${process.env.PATH || ""}`,
      },
      out_file: path.join(__dirname, "logs/ui-out.log"),
      error_file: path.join(__dirname, "logs/ui-error.log"),
      merge_logs: true,
      time: true,
    },
    {
      name: "ngrok-webhook",
      script: "/usr/local/bin/ngrok",
      args: `http --domain=${NGROK_DOMAIN} ${PORT}`,
      interpreter: "none",
      cwd: __dirname,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      out_file: path.join(__dirname, "logs/ngrok-out.log"),
      error_file: path.join(__dirname, "logs/ngrok-error.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
