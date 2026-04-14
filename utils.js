const axios = require('axios');

/**
 * Gửi tin nhắn đến Chatwork API
 * @param {string} roomId ID phòng Chatwork
 * @param {string} content Nội dung tin nhắn
 * @param {string} apiToken Token API Chatwork
 */
async function sendMessage(roomId, content, apiToken) {
  try {
    await axios.post(
      `https://api.chatwork.com/v2/rooms/${roomId}/messages`,
      `body=${encodeURIComponent(content)}`,
      {
        headers: {
          'X-ChatWorkToken': apiToken,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    console.log(`Đã gửi tin nhắn đến phòng ${roomId} thành công!`);
  } catch (error) {
    console.error('Lỗi khi gọi API Chatwork:', error.response?.data || error.message);
  }
}

module.exports = {
  sendMessage
};
