---
name: report-plan
description: Tạo báo cáo tiến độ hàng ngày cho dự án Rezil từ folder HTML export (Google Sheet) và sinh nội dung dán vào Chatwork. Dùng khi người dùng muốn làm báo cáo daily, tìm member âm giờ / chậm tiến độ, hoặc gõ /report-plan.
---

# report-plan — Báo cáo tiến độ hàng ngày Rezil

Mục tiêu: đọc folder sprint HTML (export từ Google Sheet) → tìm **member âm giờ** (chậm tiến độ) trong block "II) Member Summary" → giải thích bằng task/ticket gây chậm → sinh nội dung sẵn để dán vào **Chatwork**.

## Bước 1 — Xác định folder sprint

- Folder sprint nằm trong **thư mục làm việc hiện tại của người dùng** (không nằm trong plugin). Mặc định dùng folder sprint **mới nhất** (vd `Rezil MVP2-B - Sprint 15/`), thường bị gitignore (`Rezil*/`) nhưng vẫn nằm trên đĩa.
- Nếu có nhiều folder, hỏi người dùng chọn (hoặc lấy folder có Sprint number lớn nhất).

## Bước 2 — Parse dữ liệu

Script parse + phân tích + sinh báo cáo đi kèm plugin. Chạy:

```
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/parse-report-plan.py" "<folder sprint>" "YYYY/MM/DD"
```

→ in nội dung Chatwork ra màn hình **và ghi ra `report/<YYYY-MM-DD>.txt`** trong thư mục làm việc hiện tại (folder `report/` tự tạo). Sửa script nếu cấu trúc sheet đổi.

Script đọc 3 file trong folder sprint: `Overview.html`, `Expect.html`, `Actual.html`. HTML là dạng bảng "ritz/waffle" của Google — parse theo `<tr>`/`<td>` theo thứ tự, **bỏ qua inline style**, lọc hàng/cột rỗng.

Cấu trúc các sheet:
- **Overview**: bảng tổng hợp theo ngày — hàng `Expect`, `Actual`, `Done`, `% Expect`, `% Done`, `Forecast`, `Today Expect`, `Today Actual`, `Past Velocity`.
- **Expect**: mỗi hàng = 1 task con, cột `ID`, `Estimate`, `Assignee`, `Start`, rồi remaining **kế hoạch** theo từng ngày (cột ngày `YYYY/MM/DD`).
- **Actual**: cùng cấu trúc, remaining **thực tế** theo ngày.

Mỗi ticket (vd `MYPAGE-001`) gồm nhiều task con theo pha (BE, FE, UT/IT Testcase/Execute/Fix/Retest); assignee gắn theo task con.

## Bước 3 — Phân tích

Lấy **cột ngày tương ứng với ngày hiện tại** (header `YYYY/MM/DD` khớp hôm nay) làm ngày báo cáo — không mặc định lấy cột cuối cùng.

### ⭐ Điểm chính: block "II) Member Summary" trong Overview

Đây là cách check chuẩn của người dùng. Trong `Overview.html`, sau header `I) Daily Report` có block **`II) Member Summary`**: mỗi hàng là một member (`ID` dạng `Main - <Tên>`, `Team`, `Assignee`) với **net giờ theo từng ngày**, kết thúc bằng hàng `Grand Total`.

- Đọc giá trị ở **cột ngày hôm nay**.
- **Giá trị ÂM = member đang CHẬM / nợ giờ → CẢNH BÁO**, phải nêu rõ trong báo cáo. (Số dương/0 là bình thường.)
- Liệt kê tất cả member âm giờ hôm nay, kèm số giờ âm.

### Kết hợp với Expect/Actual

Với mỗi member bị âm giờ, tra thêm `Expect.html` + `Actual.html` (cùng cột ngày) để chỉ ra **task/ticket nào** gây chậm (Actual remaining > Expect remaining):

- **Theo member (trục chính của báo cáo)**: ai âm giờ, âm bao nhiêu, do (các) ticket/task nào còn dở.
- **Tổng quan sprint**: từ block I) — % Done vs % Expect, Remaining Actual vs Expect.

(So sánh chi tiết theo ticket chỉ dùng nội bộ để tìm task gây chậm cho member âm — không liệt kê thành mục riêng trong báo cáo Chatwork.)

## Bước 4 — Xuất báo cáo Chatwork

Script đã sinh nội dung và ghi ra `report/<YYYY-MM-DD>.txt` (1 file/ngày). Sau đó in nội dung cho người dùng copy. **Định dạng đã chốt** — dùng đúng template dưới đây:

```
[info][title]Báo cáo tiến độ Sprint XX ngày YYYY/MM/DD[/title]
Tổng quan: Done X% / Expect Y% (<nhận xét: đang trước/sau kế hoạch>)
Remaining: Actual Ah / Expect Eh

■ Member âm giờ (cần chú ý):
- <Member>: -Nh
  + <TICKET> - Nh chưa xong do xxxxx (MOB-010 Monthly Inspection IT Retest -4h chưa xong do nghỉ buổi chiều)
  + <TICKET> - Nh chưa xong do xxxxx
[/info]
```

Quy tắc điền:
- `Sprint XX` = số sprint lấy từ tên folder (vd `Rezil MVP2-B - Sprint 15` → `Sprint 15`).
- `YYYY/MM/DD` = ngày báo cáo (cột ngày hôm nay).
- Dòng `Tổng quan` + `Remaining` lấy từ block I) Daily Report.
- Mục `Member âm giờ`: liệt kê mỗi member có net giờ < 0 ở Member Summary. Dưới mỗi member, mỗi task/ticket gây chậm là một dòng `+ <TICKET> - Nh chưa xong do <lý do>`:
  - `<TICKET>`, số giờ, "chưa xong" lấy được từ Expect/Actual (Actual remaining > Expect).
  - `do <lý do>` là **lý do người dùng nhập tay** (vd "nghỉ buổi chiều"). Script không tự suy ra được → để placeholder `do …` và HỎI người dùng điền lý do cho từng member âm giờ trước khi xuất bản cuối.
- Nếu **không ai âm giờ**: bỏ toàn bộ phần liệt kê, chỉ ghi một dòng `■ Hôm nay không có member nào âm giờ.`

> Khi người dùng yêu cầu đổi cách trình bày/ngưỡng/sắp xếp về sau, **cập nhật lại template này** để `/report-plan` luôn ra đúng.

## Quy tắc đã chốt

- **Nguồn chính = block "II) Member Summary" trong Overview**, đọc cột ngày hôm nay. Số **âm = chậm/nợ giờ (cảnh báo)**; đây là điều cần tìm trước tiên.
- Kết hợp Expect/Actual để giải thích member âm giờ do ticket/task nào.
- Cột báo cáo = cột ngày khớp ngày hiện tại, không lấy cột cuối.
- Định dạng Chatwork đã chốt (xem Bước 4): block `[info][title]...[/title]...[/info]`, gồm Tổng quan + Remaining + Member âm giờ (mỗi task chậm 1 dòng `+ ... do <lý do>`).
- Title có **số Sprint** lấy từ tên folder.
- Phần `do <lý do>` phải HỎI người dùng điền tay; script chỉ điền được ticket + số giờ.
- Mỗi lần chạy ghi báo cáo ra `report/<YYYY-MM-DD>.txt` (trong thư mục làm việc hiện tại, 1 file/ngày).
