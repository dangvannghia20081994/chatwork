// PM2 ecosystem config for the Next.js AI agent UI + ngrok tunnel.
// Lives in ui-next/. Run from here:
//   cd ui-next && pm2 start ecosystem.config.js     # start UI + ngrok
//   pm2 restart ai-agent-ui-next                    # apply Next changes (build first!)
//   pm2 logs ai-agent-ui-next                       # tail logs
//   pm2 save && pm2 startup                         # persist across reboots
//
// Build the Next app before (re)starting it:  cd ui-next && npm run build
// Port: 4179 (ngrok tunnels into it). Basic auth via ui-next/.env UI_BASIC_AUTH.

const path = require("path");

const UI_NEXT = __dirname; // ui-next/

module.exports = {
  apps: [
    {
      name: "ai-agent-ui-next",
      script: "./node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 4179",
      interpreter: "node",
      cwd: UI_NEXT,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      out_file: path.join(UI_NEXT, "logs/ui-out.log"),
      error_file: path.join(UI_NEXT, "logs/ui-error.log"),
      merge_logs: true,
      time: true,
    },
    {
      name: "ngrok-webhook",
      script: "/usr/local/bin/ngrok",
      args: "http --domain=these-cadet-unaired.ngrok-free.dev 4179",
      interpreter: "none",
      cwd: UI_NEXT,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      out_file: path.join(UI_NEXT, "logs/ngrok-out.log"),
      error_file: path.join(UI_NEXT, "logs/ngrok-error.log"),
      merge_logs: true,
      time: true,
    },
  ],
};
