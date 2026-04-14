const { sendMessage } = require('../utils');

async function sendMeetingInfo(roomId, apiToken) {
  const meetingContent = `[toall][info][title]📅 THÔNG TIN PHÒNG HỌP 📅[/title]Mọi người chú ý lịch họp và truy cập đúng link nhé:
  
  🎥 *Link Google Meet*: https://meet.google.com/abc-defg-hij
  ⏰ *Daily meeting*: 09:15 AM
  ⏰ *Sprint Planning/Review*: Theo lịch cụ thể trên Calendar.
  [hr]Chúc mọi người một buổi họp hiệu quả! (coffee)[/info]`;

  await sendMessage(roomId, meetingContent, apiToken);
}

module.exports = sendMeetingInfo;
