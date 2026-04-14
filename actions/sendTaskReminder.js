const { sendMessage } = require('../utils');

async function sendTaskReminder(roomId, apiToken) {
  const taskContent = `[toall][info][title]📝 NHẮC NHỞ CÔNG VIỆC TRONG NGÀY 📝[/title]Mọi người kiểm tra lại các task của mình nhé:
  
  ✅ *Jira*: Đã cập nhật trạng thái (In Progress, Resolved)?
  ✅ *Pull Request*: Có PR nào đang đợi review không?
  ✅ *Comment*: Có feedback nào chưa trả lời không?
  [hr]Hãy hoàn thành tốt các task hôm nay nào! (muscle)[/info]`;

  await sendMessage(roomId, taskContent, apiToken);
}

module.exports = sendTaskReminder;
