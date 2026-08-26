#!/usr/bin/env node
// Tiến trình RIÊNG cho bot Telegram (pm2 app `ai-agent-telegram`).
//
// Trước đây bot chạy in-process trong Next (instrumentation.js) nên nó chết cùng app: restart hỏng
// hay app crash là mất luôn kênh Telegram — đúng lúc cần nó nhất để ra lệnh cứu hộ. Tách ra process
// riêng thì restart/crash của ai-agent-ui-next không đụng tới bot, và ngược lại.
//
// lib/telegram.js chỉ phụ thuộc lib/claude.js → lib/config.js (toàn node built-in, không có gì của
// Next) nên chạy standalone được. Node ≥22 tự nhận cú pháp ESM trong .js không khai báo type.
//
//   node telegram-bot.mjs                    # chạy tay
//   pm2 start ecosystem.config.js --only ai-agent-telegram
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// lib/telegram.js lưu state (.telegram-state.json) theo process.cwd() — giữ nó cạnh app như khi
// bot còn chạy trong Next, để không mất offset/phiên đang có.
process.chdir(HERE);
// pm2 đã nạp .env qua ecosystem.config.js; dòng này chỉ để `node telegram-bot.mjs` chạy tay cũng có
// config. dotenv KHÔNG override biến đã tồn tại nên env của pm2 vẫn thắng.
dotenv.config({ path: path.join(HERE, ".env"), quiet: true });

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error("[telegram-bot] thiếu TELEGRAM_BOT_TOKEN trong ui-next/.env — không có gì để chạy.");
  process.exit(1);
}

const { startTelegramBot } = await import("./lib/telegram.js");
startTelegramBot();

// Chết thì để pm2 dựng lại, đừng sống dở với poll loop đã hỏng.
process.on("unhandledRejection", (e) => {
  console.error("[telegram-bot] unhandled rejection:", e);
  process.exit(1);
});
process.on("uncaughtException", (e) => {
  console.error("[telegram-bot] uncaught exception:", e);
  process.exit(1);
});
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    console.log(`[telegram-bot] nhận ${sig}, thoát.`);
    process.exit(0);
  });
}
