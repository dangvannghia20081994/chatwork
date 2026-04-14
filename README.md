# Hướng dẫn Setup Chatwork Bot

Dự án này là một bot Chatwork đơn giản, lắng nghe các lệnh qua Webhook và gửi báo cáo vào một phòng Chatwork cụ thể.

## 1. Setup ngrok

Để Chatwork có thể gửi Webhook đến máy local của bạn, bạn cần sử dụng ngrok để tạo một public URL.

1.  Tải và cài đặt ngrok từ [ngrok.com](https://ngrok.com/).
2.  Chạy lệnh sau để public port 8080 (hoặc port bạn cấu hình trong `.env`):
    ```shell
    ngrok http 8080
    ```
    *Lưu ý: Nếu bạn có domain cố định, hãy sử dụng:*
    ```shell
    ngrok http --domain=these-cadet-unaired.ngrok-free.dev 8080
    ```
3.  Copy URL `https` mà ngrok cung cấp (ví dụ: `https://these-cadet-unaired.ngrok-free.dev`). URL này sẽ dùng để cấu hình Webhook trên Chatwork. (*Lưu ý: Thêm /webhook sau URL vì đây là link được code trong file bot.js :*)
## 2. Setup Chatwork

### Lấy API Key
1.  Đăng nhập vào Chatwork.
2.  Truy cập **API Settings** (thường ở góc trên bên phải, dưới menu tên của bạn).
3.  Nhập mật khẩu để lấy **API Token**.
4.  Lưu Token này vào biến `CHATWORK_API_TOKEN` trong file `.env`.

### Thiết lập Webhook
1.  Truy cập **Service Integration** > **Webhook** trong Chatwork.
2.  Nhấn **Create New**.
3.  **Webhook Name**: Đặt tên bất kỳ (ví dụ: `My Bot`).
4.  **Webhook URL**: Dán URL từ ngrok vào và thêm `/webhook` ở cuối (ví dụ: `https://these-cadet-unaired.ngrok-free.dev/webhook`).
5.  **Room ID**: Chọn phòng mà bạn muốn bot hoạt động.
6.  **Event**: Chọn các sự kiện bạn muốn bot lắng nghe (ví dụ: `Message Created`).
7.  Sau khi tạo, bạn sẽ nhận được một **Webhook Token**. Lưu Token này vào biến `CHATWORK_WEBHOOK_TOKEN` trong file `.env`.

### Lấy Room ID
*   Room ID là dãy số cuối cùng trên thanh địa chỉ khi bạn truy cập vào phòng chat trên Chatwork (ví dụ: `#!rid12345678` thì Room ID là `12345678`).
*   Lưu vào biến `CHATWORK_ROOM_ID` trong file `.env`.

## 3. Cấu hình File .env

Tạo file `.env` ở thư mục gốc (nếu chưa có) và điền các thông tin sau:

```env
CHATWORK_API_TOKEN=your_api_token_here
CHATWORK_WEBHOOK_TOKEN=your_webhook_token_here
CHATWORK_ROOM_ID=your_room_id_here
PORT=8080
```

## 4. Chạy Bot
```bash
npm install
node bot.js
```