module.exports = {
  apps: [
    {
      name: "chatwork-bot",
      script: "bot.js",
      env: {
        NODE_ENV: "production",
      }
    },
    {
      name: "ngrok webhook",
      script: "ngrok",
      args: "http --domain=these-cadet-unaired.ngrok-free.dev 8090",
      exec_mode: "fork",
      autorestart: true,
      watch: false
    }
  ]
};
