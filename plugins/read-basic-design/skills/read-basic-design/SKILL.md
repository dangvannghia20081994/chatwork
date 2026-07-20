---
name: read-basic-design
description: Đọc và tóm tắt spec của 1 màn hình từ Basic Design của dự án Rezil, đọc trực tiếp Google Sheet qua MCP (mcp__gsheets-rezil__*). Dùng khi người dùng muốn hiểu nhanh một màn hình (field, nút, luồng xử lý, validation), hoặc gõ /read-basic-design.
---

# read-basic-design — Tóm tắt spec màn hình Rezil

Mục tiêu: đọc **Basic Design của 1 màn** (đọc thẳng Google Sheet qua MCP) → tóm tắt dễ hiểu: màn này là gì, có field/nút nào, luồng xử lý, validation/error. Đồng thời ghi file trung gian `report/design/<ScreenCode>.md` để plugin `gen-testcase` / `gen-code` đọc lại.

## Nguồn dữ liệu (config cố định)

Quy ước: **1 tab = 1 màn, tên tab = tên màn** (vd `CLIENT-001 Client List`).

| Loại màn                 | Spreadsheet ID                                                                  |
| ------------------------ | ------------------------------------------------------------------------------- |
| **Web Admin** (mặc định) | `1ABO6soPFhw9zFUUFgCnqEDSscw7ihmXosa_ETEmOoO8` (REZIL - Basic Design Web Admin) |
| **Mobile** (`MOB-xxx`)   | `15cDzvbNfkzFGCMNSGGeFc3lSmCai4iqh-TsnliCSUPU` (REZIL - Basic Design Mobile)    |

- Đọc qua **MCP `gsheets-rezil`** (SA `rezil-agent.json`; file phải share Viewer cho SA — nếu 403 là chưa share). Không còn parse HTML/script Python:
  - `mcp__gsheets-rezil__list_sheets` — liệt kê tab để tìm màn.
  - `mcp__gsheets-rezil__get_sheet_data` — lấy dữ liệu tab (values only, `include_grid_data=false`).

> Nếu spreadsheet ID thay đổi, cập nhật lại block config này.

## Bước 1 — Xác định tab (màn)

- Người dùng nêu tên màn (vd `CLIENT-001 Client List`, `MOB-008 ...`). Chọn spreadsheet Web Admin hay Mobile theo mã màn (`MOB-` → Mobile, còn lại → Web Admin).
- Chạy `mcp__gsheets-rezil__list_sheets` để tìm tab khớp tên màn; nhiều kết quả (vd `Create` vs `Edit`) thì xác nhận với người dùng.

## Bước 2 — Đọc dữ liệu qua MCP

```
mcp__gsheets-rezil__get_sheet_data(
  spreadsheet_id = "1ABO6soPFhw9zFUUFgCnqEDSscw7ihmXosa_ETEmOoO8",  # hoặc file Mobile
  sheet          = "<tên màn>"                                       # vd "CLIENT-001 Client List"
)
```

→ trả về mảng `values` (mỗi phần tử là 1 hàng, mỗi hàng là list cell theo cột A, B, C...).

**Cách đọc mảng values** (thay cho parse HTML trước đây):
- Cột A (index 0) thường trống — dùng để thụt lề. **Bỏ các cell rỗng ở đầu hàng**; cell nội dung đầu tiên mới là dữ liệu.
- Hàng rỗng hoàn toàn (`[]` hoặc toàn cell trống) → bỏ.
- **Section header**: hàng chỉ có 1 cell nội dung khớp `^\d+(\.\d+)*[.\s]` (vd `1. Interface`, `3. Screen Items`, `3.2 Report Form`, `5.1 First load`).
- **Bảng** (vd Screen Items): hàng header chứa `Spec-ID` / `Field Name` / `Label Name` / `Event`; các hàng sau là dữ liệu field. Cột số thứ tự (`Spec-ID`) và mấy cell rỗng chèn giữa → gom lại theo thứ tự cell không rỗng.
- Không còn artifact "hàng tiêu đề cột bảng tính A/B/C" như bản HTML — MCP trả values sạch.

### Cấu trúc Basic Design (các section đánh số)

- **1. Interface** — link Figma / Mockup / Draw.io, ref COMMON khác.
- **2. Overview** — màn này là gì, đi tới từ đâu, URL, breadcrumb/title.
- **3. Screen Items** — bảng field: `Spec-ID | Field Name | Label Name | Data Type | Display Type | Required | Value | Description`. Có thể chia sub `3.1`, `3.2`... Đây là phần quan trọng nhất.
- **4. Database** — bảng cột DB.
- **5. 処理 (Xử lý)** — danh sách event + sub `5.1`, `5.2`... mô tả flow + Reference API + validation. Error message dạng `E-MSG-xxx` / `E-EQUIP-xxx`.

Label tiếng Nhật trong 【...】; mô tả thường lẫn Việt + Nhật. Cần nội dung chính xác 1 error message → tìm trong section 5 (hoặc tab `Error Msg` nếu có, dò bằng `list_sheets`).

## Bước 3 — Ghi file trung gian `report/design/<ScreenCode>.md`

Sau khi đọc & chuẩn hoá thành Markdown (section `## N. ...` + bảng markdown cho Screen Items, **giữ đầy đủ mô tả, không cắt**), ghi ra:

```
report/design/<ScreenCode>.md
```

trong thư mục làm việc hiện tại (tạo folder nếu chưa có). `<ScreenCode>` lấy từ tên màn ở section Overview / tên tab (vd `REPORT-002`). File này để `gen-testcase` / `gen-code` đọc lại thay vì gọi MCP mỗi lần.

> 📐 **Format table (bắt buộc)**: bảng Screen Items và các bảng khác phải là **GFM table căn cột chuẩn** — header + separator `| --- |`, mọi hàng cùng số cột, các `|` thẳng hàng (pad theo bề rộng hiển thị, ký tự CJK/tiếng Nhật = 2). Không xuống dòng thật trong cell (viết inline), ký tự `|` trong cell escape `\|`; nội dung dài (SQL) để ngoài bảng trong code fence.

## Bước 4 — Tóm tắt cho người dùng

Trình bày gọn (tiếng Việt), theo thứ tự:

1. **Màn hình là gì** (từ Overview): loại màn (popup/side-panel/list/detail), mục đích, vào từ đâu, URL.
2. **Các field chính** (từ Screen Items): nhóm input (Required) vs auto-gen (Disable). Nêu field bắt buộc, kiểu nhập (combobox/textbox/calendar...), field tự sinh.
3. **Các nút & hành động**: save/copy/delete/approve/reject... và làm gì.
4. **Luồng xử lý chính** (từ section 5): các event + tóm tắt 5.1 first load (check login/permission), validation đáng chú ý + error message (E-MSG-xxx).
5. **Link tham khảo**: Figma / Mockup / Draw.io / COMMON liên quan.

Giữ nguyên label/tên field gốc (kể cả tiếng Nhật) để khớp tài liệu. Người dùng hỏi sâu 1 field/luồng → đọc lại đúng cell/section trong values (không cắt) để trả lời đầy đủ.

## Quy tắc đã chốt

(bổ sung dần khi người dùng góp ý về cách tóm tắt)
