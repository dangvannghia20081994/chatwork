---
name: read-basic-design
description: Đọc và tóm tắt spec của 1 màn hình từ file Basic Design (HTML export từ Google Sheet) của dự án Rezil. Dùng khi người dùng muốn hiểu nhanh một màn hình (field, nút, luồng xử lý, validation), chỉ định 1 file .html trong folder "REZIL - Basic Design ...", hoặc gõ /read-basic-design.
---

# read-basic-design — Tóm tắt spec màn hình Rezil

Mục tiêu: đọc **1 file Basic Design** (theo tên người dùng đưa) → tóm tắt dễ hiểu: màn này là gì, có field/nút nào, luồng xử lý, validation/error.

## Bước 1 — Xác định file

- Người dùng chỉ định 1 file, vd `REZIL - Basic Design Web Admin/EQUIP-004 Edit Equipment.html`.
- Các folder `REZIL - Basic Design Web Admin/` và `REZIL - Basic Design Mobile/` nằm trong thư mục làm việc hiện tại, thường bị gitignore (`REZIL*/`) nhưng vẫn trên đĩa.
- Nếu người dùng chỉ đưa mã màn (vd `EQUIP-004`), tìm file khớp trong 2 folder rồi xác nhận nếu có nhiều kết quả (vd `Create` vs `Edit`).

## Bước 2 — Parse

Chạy script đi kèm plugin:

```
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/parse-basic-design.py" "<đường dẫn file .html>" [--full] [--write]
```

→ in ra Markdown đã tách theo section + bảng (tự bỏ cột số thứ tự và hàng tiêu đề cột bảng tính A, B, C...). Cờ:
- `--full`: không cắt mô tả dài (mặc định cắt ~120 ký tự cho gọn khi tóm tắt).
- `--write`: **ghi ra `report/design/<ScreenCode>.md`** trong thư mục làm việc hiện tại — file trung gian này để plugin `gen-testcase` đọc lại. Khi muốn tạo file cho gen-testcase dùng, chạy kèm cả `--full --write`.

Khi cần nội dung chính xác của một error message (`E-MSG-xxx`, `E-EQUIP-xxx`) xuất hiện trong spec, đối chiếu file `REZIL - Basic Design <Web Admin|Mobile>/Error Msg.html` (parse bằng cùng script trên).

> ⚙️ Plugin `gen-testcase` không tự parse HTML mà đọc lại file `report/design/<ScreenCode>.md` do skill này sinh ra (chạy kèm `--full --write`).

### Cấu trúc file Basic Design (ritz/waffle của Google Sheet)

Nội dung chia theo **section đánh số**:
- **1. Interface** — link Figma / Draw.io, ref tới COMMON khác.
- **2. Overview** — màn này là gì, đi tới từ đâu, URL.
- **3. Screen Items** — bảng field: `Spec-ID | Field Name | Label Name | Data Type | Display Type | Required | Value | Description`. Đây là phần quan trọng nhất.
- **4. Database** — bảng cột DB.
- **5. 処理 (Xử lý)** — danh sách event, kèm sub-section `5.1`, `5.2`... mô tả flow + Reference API + validation. Error message dạng `E-MSG-xxx` / `E-EQUIP-xxx`.

Label tiếng Nhật trong 【...】; mô tả thường lẫn tiếng Việt + Nhật. Mô tả dài bị cắt ~120 ký tự trong bảng — khi cần chi tiết một field, đọc thẳng ô đó trong HTML.

## Bước 3 — Tóm tắt cho người dùng

Trình bày gọn (tiếng Việt), theo thứ tự:

1. **Màn hình là gì** (từ Overview): loại màn (popup/list/detail), mục đích, vào từ đâu, URL.
2. **Các field chính** (từ Screen Items): nhóm theo input (Required) vs auto-gen (Disable). Nêu field bắt buộc, kiểu nhập (combobox/textbox/calendar...), field nào tự sinh.
3. **Các nút & hành động**: save/copy/delete/remove... và làm gì.
4. **Luồng xử lý chính** (từ section 5): các event + tóm tắt 5.1 first load (check login/permission), validation đáng chú ý + error message (E-MSG-xxx).
5. **Link tham khảo**: Figma / Draw.io / COMMON liên quan.

Giữ nguyên label/tên field gốc (kể cả tiếng Nhật) để khớp với tài liệu. Nếu người dùng hỏi sâu 1 field/luồng cụ thể, đọc lại ô tương ứng trong HTML (không bị cắt) để trả lời đầy đủ.

## Quy tắc đã chốt

(bổ sung dần khi người dùng góp ý về cách tóm tắt)
