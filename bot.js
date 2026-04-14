require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const app = express();

const sendRemainPlan = require('./actions/sendRemainPlan');
const sendRemainOff = require('./actions/sendRemainOff');
const sendMeetingInfo = require('./actions/sendMeetingInfo');
const sendTaskReminder = require('./actions/sendTaskReminder');
const helpAction = require('./actions/help');
const initSchedulers = require('./schedulers');

app.use(express.json());

// --- LẤY CẤU HÌNH TỪ FILE .ENV ---
const API_TOKEN = process.env.CHATWORK_API_TOKEN;
const ROOM_ID = process.env.CHATWORK_ROOM_ID;
const WEBHOOK_TOKEN = process.env.CHATWORK_WEBHOOK_TOKEN;
const BOT_ACCOUNT_ID = process.env.CHATWORK_BOT_ACCOUNT_ID;
const BOT_ACCOUNT_NAME = process.env.CHATWORK_BOT_ACCOUNT_NAME || 'Bot';
const PORT = process.env.PORT || 3000;
initSchedulers(ROOM_ID, API_TOKEN);

app.post('/webhook', async (req, res) => {
  try {
    // 1. Lấy chữ ký từ Header của Chatwork
    const signature = req.headers['x-chatworkwebhooksignature'];

    // 2. Tính toán lại mã băm (HMAC-SHA256) từ nội dung tin nhắn và Webhook Token
    const expectedSignature = crypto
      .createHmac('sha256', Buffer.from(WEBHOOK_TOKEN, 'base64'))
      .update(JSON.stringify(req.body))
      .digest('base64');

    // 3. So sánh chữ ký để đảm bảo dữ liệu thật sự từ Chatwork gửi qua
    if (signature !== expectedSignature) {
      console.warn("Cảnh báo: Có yêu cầu không hợp lệ (Signature mismatch)!");
      return res.sendStatus(403); // Từ chối nếu không khớp
    }

    const messageText = req.body.webhook_event.body;
    const accountId = req.body.webhook_event.account_id;

    // Bỏ qua tin nhắn từ chính bot để tránh loop
    if (BOT_ACCOUNT_ID && String(accountId) === String(BOT_ACCOUNT_ID)) {
      return res.status(200).send('OK');
    }

    // Chỉ xử lý nếu tin nhắn có mention (To) đến bot
    const botMention = `[To:${BOT_ACCOUNT_ID}]`;
    if (!messageText || !messageText.includes(botMention)) {
      return res.status(200).send('OK');
    }

    // Lấy nội dung sau phần mention
    const commandText = messageText.split(botMention).pop();

    // Kiểm tra lệnh từ người dùng (Lấy từ cuối cùng của dòng đầu tiên hoặc toàn bộ các dòng sau)
    // Để bỏ qua tên bot nếu có (ví dụ: "[To:123] Rezil bot\nhelp" -> "help")
    let command = "";
    const lines = messageText.split('\n').map(l => l.trim());
    if (lines[0].includes(botMention)) {
      command = lines.slice(1).join(' ').trim().toLowerCase();
    }

    if (!command && commandText) {
      const parts = commandText.trim().split(/\s+/);
      command = parts[parts.length - 1].toLowerCase();
    }

    if (command) {
      if (command.includes("report")) {
        console.log("Xác thực thành công! Đang chuẩn bị gửi report theo lệnh...");
        await sendRemainPlan(ROOM_ID, API_TOKEN);
      } else if (command.includes("leave")) {
        console.log("Xác thực thành công! Đang chuẩn bị gửi nhắc nhở theo lệnh...");
        await sendRemainOff(ROOM_ID, API_TOKEN);
      } else if (command.includes("meeting")) {
        console.log("Xác thực thành công! Đang chuẩn bị gửi thông tin phòng họp...");
        await sendMeetingInfo(ROOM_ID, API_TOKEN);
      } else if (command.includes("task")) {
        console.log("Xác thực thành công! Đang chuẩn bị gửi nhắc nhở công việc...");
        await sendTaskReminder(ROOM_ID, API_TOKEN);
      } else if (command.includes("help")) {
        console.log("Xác thực thành công! Đang chuẩn bị gửi hướng dẫn...");
        await helpAction(ROOM_ID, API_TOKEN, BOT_ACCOUNT_NAME);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Lỗi xử lý Webhook:', error.message);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`Bot ${BOT_ACCOUNT_NAME} đã được bảo mật và đang lắng nghe tại cổng ${PORT}...`);
});
