---
name: read-testcase-template
description: Đọc file mẫu test case UT.html/IT.html (export Google Sheet) của team Rezil và trích ra template (cột, header block, thứ tự section, convention) ghi vào report/template/{ut,it}.md để plugin gen-testcase dùng lại. Dùng khi muốn cập nhật template test case từ file mẫu mới nhất, hoặc gõ /read-testcase-template.
---

# read-testcase-template — Trích template test case UT/IT

Mục tiêu: đọc file mẫu **`REZIL - Testcase/UT.html`** và **`IT.html`** → trích cấu trúc chuẩn → ghi ra `report/template/ut.md`, `report/template/it.md`. Đây là **file trung gian** để `gen-testcase` đọc lại (thay vì parse HTML mỗi lần).

Chạy 1 lần (hoặc khi file mẫu đổi). Output ổn định, gọn, dễ tái dùng.

## Bước 1 — Xác định file mẫu

- Mặc định: `REZIL - Testcase/UT.html` và `REZIL - Testcase/IT.html` trong thư mục làm việc hiện tại (folder `REZIL*/` thường bị gitignore nhưng vẫn trên đĩa).
- File mẫu hiện dựa trên màn EQUIP-003 — đủ đại diện các section (S03/S04/S05/S12/S7 Log).

## Bước 2 — Trích & ghi file

Chạy cho từng loại:

```
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/parse-testcase-template.py" "REZIL - Testcase/UT.html" --write
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/parse-testcase-template.py" "REZIL - Testcase/IT.html" --write
```

→ ghi `report/template/ut.md` và `report/template/it.md` (tự tạo folder). Mỗi file gồm:
- **Header block** — metadata đầu sheet (Total TCs, Screen Code_Name, SYSTEM/FUNCTION, ...).
- **Cột bảng test case** — đúng thứ tự cột. UT và IT giống 7 cột đầu (TC No. → Expected Result), khác cụm cột kết quả:
  - UT: `Test UT Result | Executed Date | Status fix bug | DEV | Note | Bug Severity`
  - IT: `Test IT Result | Executed Date | SQA | Evidence | Note`
- **Section + case mẫu** — thứ tự nhóm case (S03 Di chuyển → S04/S05 Hiển thị+Xử lý → S12 sau Search → S7 Log) kèm vài case mẫu minh hoạ convention.

## Convention quan trọng (giữ khi sinh case)

- `↑` = kế thừa giá trị y hệt dòng trên (không lặp lại).
- `Check Object 1` = field/nhóm đối tượng; `Check Object 2` = khía cạnh kiểm tra (Item type / Default value / Click / Input data / Maxlength / Validation...).
- `Steps` và `Expected Result` đánh số `1.`, `2.`... tương ứng.
- Error message ghi cả `MSG_ID` + nội dung tiếng Nhật.
- Khi sinh case mới: **để trống các cột kết quả** (từ sau Expected Result).

## Quy tắc đã chốt

(bổ sung dần khi người dùng góp ý)
