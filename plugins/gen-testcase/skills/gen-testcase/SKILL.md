---
name: gen-testcase
description: Sinh UT/IT test case cho 1 màn hình từ file Basic Design (HTML export Google Sheet) của dự án Rezil, theo đúng template test case của team. Dùng khi người dùng muốn tạo test case từ 1 file .html trong "REZIL - Basic Design ...", hoặc gõ /gen-testcase.
---

# gen-testcase — Sinh UT/IT test case theo Basic Design Rezil

Mục tiêu: từ spec màn hình + template chuẩn → sinh bộ **test case** (UT hoặc IT) đúng cột & convention, để dán lại vào file test case Google Sheet của team.

**gen-testcase KHÔNG tự parse HTML.** Nó đọc lại các file `.md` trung gian do 2 plugin khác sinh ra:
- **Spec màn hình**: `report/design/<ScreenCode>.md` ← plugin `read-basic-design`.
- **Template UT/IT**: `report/template/ut.md`, `report/template/it.md` ← plugin `read-testcase-template`.

Ngoài ra đọc `${CLAUDE_PLUGIN_ROOT}/skills/gen-testcase/template.md` — tri thức về **kỹ thuật thiết kế case** (boundary, decision table, permission matrix, mapping Basic Design → section) không có trong file mẫu.

## Bước 1 — Xác định đầu vào & chuẩn bị file trung gian

- **Màn hình**: người dùng chỉ định mã màn (vd `EQUIP-004 Edit Equipment`). Nếu mơ hồ (Create vs Edit) thì hỏi lại.
- **Loại test case**: UT hay IT? Nếu chưa rõ thì hỏi (khác nhau ở cụm cột kết quả).
- **Định dạng xuất**: Markdown để review hay CSV để import — hỏi nếu chưa rõ.

Kiểm tra file trung gian, **nếu thiếu thì sinh trước khi sinh case**:

- Nếu chưa có `report/template/ut.md` / `report/template/it.md` (theo loại đang làm)
  → **gọi skill `/read-testcase-template`** để nó sinh ra. (Skill đó tự biết đường dẫn script của
  mình qua `${CLAUDE_PLUGIN_ROOT}` — gen-testcase không tự định vị plugin khác được, nên gọi skill
  là cách đáng tin cậy nhất.)
- Nếu chưa có `report/design/<ScreenCode>.md`
  → **gọi skill `/read-basic-design`** với file `.html` của màn, yêu cầu chạy chế độ `--full --write`.

Chỉ tiếp tục Bước 2 khi đã có đủ `report/design/<ScreenCode>.md` + `report/template/<ut|it>.md`.
Nếu không gọi được skill kia (vd chưa cài), báo người dùng gõ `/read-testcase-template` và
`/read-basic-design` trước, rồi chạy lại `/gen-testcase`.

## Bước 2 — Đọc dữ liệu đã chuẩn hóa

Đọc 3 nguồn `.md`: spec màn (`report/design/<ScreenCode>.md`), template (`report/template/ut.md` hoặc `it.md`), và `template.md` (kỹ thuật thiết kế).

Khi cần nội dung chính xác của 1 error message, đối chiếu `REZIL - Basic Design <Web Admin|Mobile>/Error Msg.html` (hoặc đã có trong file design `--full`).

## Bước 3 — Sinh test case

Theo `template.md`:

1. Điền **header block** (Screen Code_Name = tên màn, các trường khác để mặc định/trống).
2. Sinh case theo **thứ tự section** (S03 di chuyển → S04/S05 hiển thị+xử lý → S12 sau search nếu có → Log).
3. Với **mỗi field** trong `3. Screen Items`, lặp các khía cạnh: Item type → Default → Disable/auto-gen → Click/Input/Select → Validation.
4. Áp dụng **kỹ thuật thiết kế case** (boundary, equivalence, decision table, state/flow, permission matrix) — xem mục 3 của `template.md`.
5. **Case UI/Style theo Figma** (mục 4 của `template.md`): nếu `1. Interface` có link Figma → sinh thêm case style ở S04 (fontSize, fontWeight, color, spacing, alignment...). Nếu có **MCP Figma** thì lấy giá trị thật và ghi cụ thể; nếu chỉ có link thì sinh case checklist đối chiếu kèm link.
6. Mỗi validation/error → 1 case ghi rõ `MSG_ID + nội dung`.
7. Để trống các cột kết quả (chỉ điền TC No. → Expected Result).
8. Dùng `↑` để kế thừa giá trị dòng trên đúng convention.

## Bước 4 — Xuất & bàn giao

- **Markdown**: in bảng theo cột template để người dùng review nhanh.
- **CSV**: 1 dòng/case, escape đúng để import Google Sheet. Ghi ra `report/testcase/<ScreenCode>-<UT|IT>.csv` trong thư mục làm việc hiện tại (vd `report/testcase/EQUIP-004-IT.csv`), tự tạo folder nếu chưa có.
- **Checklist độ phủ theo section** (mỗi màn 1 file): sau khi ghi CSV, chạy
  `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/coverage.py" "<ScreenCode>"`
  → lập checklist theo từng section của Basic Design (✅ đã phủ / 🔶 một phần / ⬜ chưa / ➖ bỏ qua COMMON/out-of-scope), ghi `report/testcase/<ScreenCode>-coverage.md` và in ra. **Gen tới section nào thì section đó được tick.** Báo người dùng tiến độ (vd "7/8 section") và section nào còn ⬜ để gen bù.
- Báo tổng số case sinh được; nêu rõ phần nào suy ra từ Basic Design, phần nào là case mở rộng (boundary/permission) để người dùng kiểm.

## Quy tắc đã chốt

- gen-testcase **không tự parse HTML**; chỉ đọc file `.md` trung gian:
  `report/design/<ScreenCode>.md` + `report/template/<ut|it>.md` + `template.md`.
- **Thiếu file trung gian → gọi skill tương ứng trước**: thiếu template → `/read-testcase-template`;
  thiếu design → `/read-basic-design` (chế độ `--full --write`). Không tự định vị plugin khác bằng đường dẫn.
- Cấu trúc cột/header/section lấy từ `report/template/*.md`; mapping + kỹ thuật thiết kế case lấy từ `template.md`.
- Có link Figma trong `1. Interface` → sinh thêm **case UI/Style** (fontSize, fontWeight, color, spacing, alignment...). Có MCP Figma thì ghi giá trị thật; chỉ có link thì sinh case checklist đối chiếu kèm link.
- **Số lượng case**: nếu người dùng nêu số mục tiêu (vd "400 UT, 300 IT") → cố đạt sát con số đó. Nếu **không nêu** → tự quyết theo Basic Design (đủ phủ mọi field/validation/luồng/popup/log/UI), không ép số.
- ⚖️ **COMMON — bỏ phần chung, GIỮ phần đặc thù màn**: chỗ ref "COMMON-xxx" → bỏ logic/thao tác chung (đã test ở màn COMMON), NHƯNG **vẫn sinh case** cho cấu hình/giá trị riêng của màn nêu trong spec. Cụ thể **không bỏ qua**: display setting / view config (`default_view_config`: cột nào + thứ tự, screen_name, fixed column), export csv/excel (cột được export + thứ tự). Section chỉ trỏ COMMON mà không có gì riêng (vd `5.3 Export CSV`) thì mới bỏ hẳn. Log read/access/search của màn → giữ. (Xem mục 2 `template.md`.)
