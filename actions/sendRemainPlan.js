const { sendMessage } = require('../utils');

async function sendRemainPlan(roomId, apiToken) {
  const reportContent = `[toall]
  [info][title]THÔNG BÁO NHẮC LẠI 📊[/title]
  ~~~KHÔNG TỰ Ý CHỈNH SỬA LOGTIME NGÀY QUÁ KHỨ~~~
  Rì pọt thoai ạ
  Có issue gì nhớ note lại cho e nhé, ví dụ: task nào pending ai, pending chỗ nào....delay do sao....
  CHÚ Ý: Note rõ ràng nội dung, lí do, tình trạng task và ảnh hưởng đến tiến độ ra sao. ==> Vào phần task trong ngày
  
  Sprint 10
  https://docs.google.com/spreadsheets/d/1o-PVPX8nRl3gVNxP050Royg3WY7hFDlmU6MkfsnCCNc/edit?gid=525800568#gid=525800568
  [/info]`;

  await sendMessage(roomId, reportContent, apiToken);
}

module.exports = sendRemainPlan;
