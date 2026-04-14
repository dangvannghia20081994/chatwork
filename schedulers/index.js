const cron = require('node-cron');
const sendRemainPlan = require('../actions/sendRemainPlan');
const sendRemainOff = require('../actions/sendRemainOff');

function initSchedulers(roomId, apiToken) {
  // Nhắc Plan lúc 16:00 (4h chiều) từ thứ 2 - thứ 6 hàng tuần
  cron.schedule('00 16 * * 1-5', async () => {
    try {
      console.log('--- Đang chạy lịch nhắc nhở Plan tự động ---');
      await sendRemainPlan(roomId, apiToken);
    } catch (error) {
      console.error('Lỗi khi chạy scheduler Plan:', error.message);
    }
  });

  // Nhắc Leave lúc 08:00 sáng từ thứ 2 - thứ 6 hàng tuần
  cron.schedule('0 8 * * 1-5', async () => {
    try {
      console.log('--- Đang chạy lịch nhắc nhở Leave tự động ---');
      await sendRemainOff(roomId, apiToken);
    } catch (error) {
      console.error('Lỗi khi chạy scheduler Leave:', error.message);
    }
  });
}

module.exports = initSchedulers;
