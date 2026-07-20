---
name: gen-testcase
description: Sinh UT/IT test case cho 1 màn hình từ Basic Design của dự án Rezil, theo đúng template test case của team. Dùng khi người dùng muốn tạo test case cho 1 màn, hoặc gõ /gen-testcase.
---

# gen-testcase — Sinh UT/IT test case theo Basic Design Rezil

Mục tiêu: từ spec màn hình + template chuẩn → sinh bộ **test case** (UT hoặc IT) đúng cột & convention, để dán lại vào file test case Google Sheet của team.

**gen-testcase KHÔNG tự đọc Google Sheet.** Nó đọc lại các file `.md` trung gian do 2 plugin khác sinh ra (qua MCP):
- **Spec màn hình**: `report/design/<ScreenCode>.md` ← plugin `read-basic-design`.
- **Template UT/IT**: `report/template/ut.md`, `report/template/it.md` ← plugin `read-testcase-template`.

Ngoài ra đọc `${CLAUDE_PLUGIN_ROOT}/skills/gen-testcase/template.md` — tri thức về **kỹ thuật thiết kế case** (boundary, decision table, permission matrix, mapping Basic Design → section) không có trong file mẫu.

## Bước 1 — Xác định đầu vào & chuẩn bị file trung gian

- **Màn hình**: người dùng chỉ định mã màn (vd `EQUIP-004 Edit Equipment`). Nếu mơ hồ (Create vs Edit) thì hỏi lại.
- **Loại test case**: UT hay IT? Nếu chưa rõ thì hỏi (khác nhau ở cụm cột kết quả).
- **Định dạng xuất**: Markdown để review hay CSV để import — hỏi nếu chưa rõ.
- 🔢 **Số lượng test case (BẮT BUỘC hỏi trước khi sinh)**: sau khi đã đọc BD (design `.md`), **ước tính số case có thể viết** dựa trên spec rồi **hỏi người dùng số lượng mong muốn**, kèm gợi ý:
  - Cách ước tính: đếm theo Screen Items + 処理 và nhân hệ số khía cạnh:
    - mỗi **field/item** UI: UT ~4–8 case (item type, active/inactive, default value, giá trị/list, chọn, search chính xác/gần đúng/không kết quả, format); IT ~1–3 case.
    - mỗi **event/flow** (section 5) + **validation** (mỗi rule/error `E-MSG`): +1–3 case.
    - **cố định**: di chuyển màn + phân quyền (~4–6), layout/khởi tạo (~3–5), paging/CSV/log (~3–6).
  - Trình bày gợi ý dạng khoảng + con số đề xuất, vd: *"UT ~90–120 (đề xuất 100), IT ~35–45 (đề xuất 40). Bạn muốn bao nhiêu?"*. UT thường **gấp 2–3 lần** IT (theo mẫu: 216 UT vs 92 IT ở CACC-001).
  - Nếu người dùng nêu số cụ thể → **sinh đủ đến số đó** (không dừng sớm; đủ phủ spec thì mở rộng thêm boundary/decision/permission/UI). Nếu người dùng nói "tự quyết / đủ phủ" → dùng con số đề xuất.

Kiểm tra file trung gian, **nếu thiếu thì sinh trước khi sinh case**:

- Nếu chưa có `report/template/ut.md` / `report/template/it.md` (theo loại đang làm)
  → **gọi skill `/read-testcase-template`** để nó sinh ra. (Skill đó tự biết đường dẫn script của
  mình qua `${CLAUDE_PLUGIN_ROOT}` — gen-testcase không tự định vị plugin khác được, nên gọi skill
  là cách đáng tin cậy nhất.)
- Nếu chưa có `report/design/<ScreenCode>.md`
  → **gọi skill `/read-basic-design`** cho màn đó (nó đọc tab tên màn qua MCP và ghi `report/design/<ScreenCode>.md`).

Chỉ tiếp tục Bước 2 khi đã có đủ `report/design/<ScreenCode>.md` + `report/template/<ut|it>.md`.
Nếu không gọi được skill kia (vd chưa cài), báo người dùng gõ `/read-testcase-template` và
`/read-basic-design` trước, rồi chạy lại `/gen-testcase`.

## Bước 2 — Đọc dữ liệu đã chuẩn hóa

Đọc 3 nguồn `.md`: spec màn (`report/design/<ScreenCode>.md`), template (`report/template/ut.md` hoặc `it.md`), và `template.md` (kỹ thuật thiết kế).

Khi cần nội dung chính xác của 1 error message, đối chiếu section 5 trong `report/design/<ScreenCode>.md` (hoặc gọi lại `/read-basic-design` cho tab `Error Msg` nếu có).

## Bước 3 — Sinh test case

Theo `template.md`:

1. Điền **header block** (Screen Code_Name = tên màn, các trường khác để mặc định/trống).
2. Sinh case theo **thứ tự section** (di chuyển màn → hiển thị khởi tạo + xử lý sau thao tác → vùng search → table list → download CSV → log). UT đánh số `Sxx`, IT dùng tiêu đề chữ (theo `report/template/{ut,it}.md`).
3. Với **mỗi field** trong `3. Screen Items`, lặp các khía cạnh: Item type → Default → Disable/auto-gen → Click/Input/Select → Validation.
4. Áp dụng **kỹ thuật thiết kế case** (boundary, equivalence, decision table, state/flow, permission matrix) — xem mục 3 của `template.md`.
5. **Case UI/Style theo Figma** (mục 4 của `template.md`): nếu `1. Interface` có link Figma → sinh thêm case style ở S04 (fontSize, fontWeight, color, spacing, alignment...). Nếu có **MCP Figma** thì lấy giá trị thật và ghi cụ thể; nếu chỉ có link thì sinh case checklist đối chiếu kèm link.
6. Mỗi validation/error → 1 case ghi rõ `MSG_ID + nội dung`.
7. Để trống các cột kết quả (chỉ điền TC No. → Expected Result).
8. Dùng `↑` để kế thừa giá trị dòng trên đúng convention.

## Bước 4 — Xuất & bàn giao

Ghi ra `report/testcase/<ScreenCode>_<UT|IT>.<md|csv>` (theo định dạng đã chọn ở Bước 1), tự tạo folder nếu chưa có:
- **Markdown** (`_IT.md` / `_UT.md`): bảng GFM **căn cột chuẩn** theo cột template (review nhanh). Vd `report/testcase/EQUIP-004_IT.md`.
- **CSV** (`_IT.csv` / `_UT.csv`): 1 dòng/case, escape đúng để import Google Sheet.
- **Checklist độ phủ theo section** (mỗi màn 1 file): sau khi ghi file case, chạy
  `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/coverage.py" "<ScreenCode>"`
  → lập checklist theo từng section của Basic Design (✅ đã phủ / 🔶 một phần / ⬜ chưa / ➖ bỏ qua COMMON/out-of-scope), ghi `report/testcase/<ScreenCode>-coverage.md` và in ra. **Gen tới section nào thì section đó được tick.** Báo người dùng tiến độ (vd "7/8 section") và section nào còn ⬜ để gen bù.
- Báo tổng số case sinh được; nêu rõ phần nào suy ra từ Basic Design, phần nào là case mở rộng (boundary/permission) để người dùng kiểm.

## Quy tắc đã chốt

- gen-testcase **không tự đọc Google Sheet**; chỉ đọc file `.md` trung gian:
  `report/design/<ScreenCode>.md` + `report/template/<ut|it>.md` + `template.md`.
- 🔢 **Luôn hỏi số lượng test case mong muốn TRƯỚC khi sinh**, kèm gợi ý ước tính từ BD (xem Bước 1). Không tự ý sinh khi chưa chốt số lượng (trừ khi người dùng đã nói "tự quyết").
- **Thiếu file trung gian → gọi skill tương ứng trước**: thiếu template → `/read-testcase-template`;
  thiếu design → `/read-basic-design`. Không tự định vị plugin khác bằng đường dẫn.
- Cấu trúc cột/header/section lấy từ `report/template/*.md`; mapping + kỹ thuật thiết kế case lấy từ `template.md`.
- 📐 **Format table (bắt buộc)**: test case ghi ra `.md` phải là **GFM table căn cột chuẩn** — header + separator `| --- |`, mọi hàng cùng số cột, các `|` thẳng hàng (pad theo bề rộng hiển thị, ký tự CJK/tiếng Nhật = 2). Steps/Expected đánh số inline `1) ... 2) ...` (KHÔNG xuống dòng thật trong cell), ký tự `|` escape `\|`; SQL/nội dung dài để ngoài bảng hoặc rút gọn.
- Có link Figma trong `1. Interface` → sinh thêm **case UI/Style** (fontSize, fontWeight, color, spacing, alignment...). Có MCP Figma thì ghi giá trị thật; chỉ có link thì sinh case checklist đối chiếu kèm link.
- **Số lượng case**: nếu người dùng nêu số mục tiêu (vd "400 UT, 300 IT") → cố đạt sát con số đó. Nếu **không nêu** → tự quyết theo Basic Design (đủ phủ mọi field/validation/luồng/popup/log/UI), không ép số.
- ⚖️ **COMMON — bỏ phần chung, GIỮ phần đặc thù màn**: chỗ ref "COMMON-xxx" → bỏ logic/thao tác chung (đã test ở màn COMMON), NHƯNG **vẫn sinh case** cho cấu hình/giá trị riêng của màn nêu trong spec. Cụ thể **không bỏ qua**: display setting / view config (`default_view_config`: cột nào + thứ tự, screen_name, fixed column), export csv/excel (cột được export + thứ tự). Section chỉ trỏ COMMON mà không có gì riêng (vd `5.3 Export CSV`) thì mới bỏ hẳn. Log read/access/search của màn → giữ. (Xem mục 2 `template.md`.)
