---
name: read-testcase-template
description: Đọc mẫu test case UT/IT của team Rezil trực tiếp từ Google Sheet qua MCP (mcp__gsheets-rezil__*) và trích ra template (cột, header block, thứ tự section, convention) ghi vào report/template/{ut,it}.md để plugin gen-testcase dùng lại. Dùng khi muốn cập nhật template test case từ mẫu mới nhất, hoặc gõ /read-testcase-template.
---

# read-testcase-template — Trích template test case UT/IT

Mục tiêu: đọc **cặp tab mẫu** (IT ở tab `<màn>`, UT ở tab `UT_<màn>`) trên Google Sheet → trích cấu trúc chuẩn → ghi ra `report/template/it.md` và `report/template/ut.md`. Đây là **file trung gian** để `gen-testcase` đọc lại (thay vì đọc MCP mỗi lần).

Chạy 1 lần (hoặc khi mẫu đổi). Output ổn định, gọn, dễ tái dùng.

## Nguồn dữ liệu (config cố định)

- **Spreadsheet ID**: `1YJa5iFt74z_bw0GfWy2CObK7JldkHfBbXRLDRwaQ86w` (file **REZIL - Test Plan - Test Report**).
- **Tab mẫu**: IT ở tab `<CODE Tên màn>`, UT ở tab `UT_<CODE Tên màn>` (mỗi màn 1 cặp tab, UT và IT **TÁCH RIÊNG**). Mặc định lấy 1 màn list đại diện (vd `CACC-001 Customer Account List` + `UT_CACC-001 Customer Account List`) để trích cấu trúc; hoặc màn người dùng chỉ định.
- Đọc qua **MCP `gsheets-rezil`** (SA `rezil-agent.json`; file phải share Viewer cho SA — 403 là chưa share). Không còn parse HTML/script Python:
  - `mcp__gsheets-rezil__list_sheets` — liệt kê tab.
  - `mcp__gsheets-rezil__get_sheet_data` — lấy dữ liệu tab (values only).

> Nếu spreadsheet ID thay đổi, cập nhật lại block config này.

## Bước 1 — Đọc dữ liệu qua MCP

```
mcp__gsheets-rezil__get_sheet_data(spreadsheet_id="1YJa5iFt74z_bw0GfWy2CObK7JldkHfBbXRLDRwaQ86w", sheet="CACC-001 Customer Account List")       # mẫu IT
mcp__gsheets-rezil__get_sheet_data(spreadsheet_id="1YJa5iFt74z_bw0GfWy2CObK7JldkHfBbXRLDRwaQ86w", sheet="UT_CACC-001 Customer Account List")    # mẫu UT
```

→ trả về mảng `values` (mỗi phần tử là 1 hàng theo cột A, B, C...). Bỏ cell rỗng ở đầu hàng và hàng rỗng.

## Bước 2 — Nhận diện cấu trúc trong values

UT và IT là **2 tab riêng** (`<màn>` và `UT_<màn>`), 7 cột đầu giống nhau, khác cụm cột kết quả:
- **Hàng cột** (header, ~row 12): hàng có cell `TC No.`. 7 cột chung:
  ```
  TC No. | Check Object 1 | Check Object 2 | Check content | Pre-condition / Test Data | Steps | Expected Result
  ```
- Cụm kết quả **IT** (tab `<màn>`): `Test IT Result | Executed Date | SQA | Evidence | Note (DefectID, Actual result)`
- Cụm kết quả **UT** (tab `UT_<màn>`): `Test UT Result | Executed Date | Status fix bug | DEV | Note (DefectID, Actual result) | Bug Severity`
- **Header block**: các hàng **trước** hàng cột `TC No.` (metadata: Total TCs, Screen Code_Name, SYSTEM/FUNCTION, Main Environment, SQA Create, ô đếm OK/NG/Pending/N/A, % Test Progress...).
- **Section tiêu đề**:
  - IT: tiêu đề chữ `Kiểm tra_...` (vd `Kiểm tra_Di chuyển màn hình`, `Vùng điều kiện search`, `Table list`).
  - UT: đánh số `Sxx_...` (vd `S03_Kiểm tra_Di chuyển màn hình`, `S03.1 : ...`, `S04_.../S05_...`) — bóc nhỏ hơn IT (thêm case browser F5/Back/Next; mỗi item nhiều khía cạnh: Item type/Active/Default/Giá trị/Chọn/Search chính xác-gần đúng-không kết quả).
  - Cũng có hàng tên màn (vd `CACC-001 Customer Account List`) đứng trước section đầu.
- **Case**: hàng có `TC No.` là số. Lấy vài case mẫu đầu mỗi section làm minh hoạ convention. Cột A đôi khi có marker `o` = case đại diện.

## Bước 3 — Ghi 2 file template

- **`report/template/it.md`** — từ tab `<màn>`: header block + 7 cột chung + cụm IT + section (chữ) + case mẫu.
- **`report/template/ut.md`** — từ tab `UT_<màn>`: header block + 7 cột chung + cụm UT + section (Sxx) + case mẫu.

Ghi vào thư mục làm việc hiện tại (tạo `report/template/` nếu chưa có).

> 📐 **Format table (bắt buộc)**: bảng trong `.md` phải là **GFM table căn cột chuẩn** — header + separator `| --- |`, mọi hàng cùng số cột, các `|` thẳng hàng (pad theo bề rộng hiển thị, ký tự CJK/tiếng Nhật = 2). Không xuống dòng thật trong cell, ký tự `|` escape `\|`; nội dung dài để ngoài bảng trong code fence.

## Convention quan trọng (giữ khi sinh case)

- `↑` = kế thừa giá trị y hệt dòng trên (không lặp lại).
- `Check Object 1` = field/nhóm đối tượng; `Check Object 2` = khía cạnh kiểm tra (Item type / Default value / Click / Input data / Maxlength / Validation...).
- `Steps` và `Expected Result` đánh số `1.`, `2.`... tương ứng.
- Error message ghi cả `MSG_ID` + nội dung tiếng Nhật.
- Khi sinh case mới: **để trống các cột kết quả** (từ sau Expected Result).

## Quy tắc đã chốt

(bổ sung dần khi người dùng góp ý)
