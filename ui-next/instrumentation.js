// Next.js server bootstrap hook: runs once when the Node server starts (pm2 `next start`).
//
// Bot Telegram nay chạy ở TIẾN TRÌNH RIÊNG (pm2 app `ai-agent-telegram`, xem telegram-bot.mjs) để
// nó không chết theo mỗi lần app này restart/crash. Hai process cùng long-poll một token là
// Telegram trả 409 Conflict, nên ở đây MẶC ĐỊNH KHÔNG start bot nữa — chỉ bật lại bằng
// TELEGRAM_IN_PROCESS=1 khi cố tình chạy bot chung với app (ví dụ `npm run dev` cho tiện, và khi đó
// phải `pm2 stop ai-agent-telegram` trước).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.TELEGRAM_IN_PROCESS !== "1") return;
  const { startTelegramBot } = await import("./lib/telegram.js");
  startTelegramBot();
}
