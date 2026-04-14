const { sendMessage } = require('../utils');

async function sendRemainPlan(roomId, apiToken) {
  const reportContent = `[toall][info][title]📊 THÔNG BÁO NHẮC LẠI: RÌ PỌT THOAI 📊[/title]⚠️ QUAN TRỌNG: KHÔNG TỰ Ý CHỈNH SỬA LOGTIME NGÀY QUÁ KHỨ
  
  Mọi người hãy dành chút thời gian cập nhật nội dung cho dự án nhé:
  📝 Nội dung: Note rõ ràng lí do, tình trạng task và ảnh hưởng đến tiến độ.
  🔗 Link Sprint 10: https://docs.google.com/spreadsheets/d/1o-PVPX8nRl3gVNxP050Royg3WY7hFDlmU6MkfsnCCNc/edit?gid=525800568#gid=525800568
  [hr]💡 Nếu có issue gì (pending ai, delay do đâu...) hãy note lại ngay để team nắm thông tin nhé! (coffee)[/info]`;

  await sendMessage(roomId, reportContent, apiToken);
}

module.exports = sendRemainPlan;
