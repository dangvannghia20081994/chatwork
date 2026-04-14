const { sendMessage } = require('../utils');

async function help(roomId, apiToken, botName = 'Bot') {
  const helpContent = `[toall]
[info][title]🤖 HƯỚNG DẪN SỬ DỤNG BOT ${botName.toUpperCase()} 🤖[/title]Chào bạn, tôi là ${botName}. Dưới đây là các lệnh tôi có thể hỗ trợ:

(F) *report*: 📊 Nhắc nhở điền Plan/Logtime.
(F) *leave*: 🏠 Nhắc nhở điền thông tin nghỉ/đi muộn/về sớm.
(F) *help*: ❓ Hiển thị danh sách các lệnh hỗ trợ.

[hr]💡 *Mẹo:* Mention tôi và kèm theo lệnh (VD: ${botName} help)[/info]`;

  await sendMessage(roomId, helpContent, apiToken);
}

module.exports = help;
