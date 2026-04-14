const { sendMessage } = require('../utils');

async function sendRemainOff(roomId, apiToken) {
  const reportContent = `[toall][info][title]THÔNG BÁO NHẮC LẠI 📊[/title]
  Mọi người nghỉ hay đi muộn về sớm thì nhớ note vào file này nhé.
  https://docs.google.com/spreadsheets/d/1cofpKlVhuQhp9kcz2I9LaJgrntI-pQZV4GLqQwbJdA8/edit?gid=993606591#gid=993606591
  [/info]`;

  await sendMessage(roomId, reportContent, apiToken);
}

module.exports = sendRemainOff;
