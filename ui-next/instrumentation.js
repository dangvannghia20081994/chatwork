// Next.js server bootstrap hook: runs once when the Node server starts (pm2 `next start`).
// We use it to launch the Telegram long-polling bot in-process, reusing lib/claude.js directly.
// No-op unless TELEGRAM_BOT_TOKEN is set, and only in the Node runtime (never edge/build).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startTelegramBot } = await import("./lib/telegram.js");
  startTelegramBot();
}
