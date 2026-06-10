# Kỹ thuật sinh test case Rezil (bổ trợ cho gen-testcase)

File này chứa **tri thức QA không có trong file mẫu** UT/IT. Cấu trúc cột, header block,
thứ tự section và case mẫu → đọc từ `report/template/{ut,it}.md` (do `read-testcase-template` sinh).
File này chỉ bổ sung: cách *map* Basic Design ra case, và *kỹ thuật* thiết kế case cho từng field.

---

## 1. Convention cần nhớ (tóm tắt)

- **`↑`**: kế thừa giá trị y hệt dòng ngay trên (`Check Object 1/2`, `Pre-condition`, `Steps`) — không lặp lại.
- **`Check Object 1`** = field/nhóm đối tượng (vd `equipment_code`, `save_btn`, `First load`, `Layout tổng thể`).
- **`Check Object 2`** = khía cạnh kiểm tra (`Item type`, `Default value`, `Click`, `Input data`, `Maxlength`, `Validation`...).
- **`Steps`** / **`Expected Result`** đánh số `1.`, `2.`... tương ứng.
- **Error message**: ghi cả `MSG_ID` + nội dung tiếng Nhật, vd `E-MSG-002: 備考は1000文字以内で入力してください`.
- Giữ nguyên **label tiếng Nhật** và **tên field gốc** để khớp Basic Design.
- Tên evidence (IT): `<ScreenCode>_<TCNo padding 3>.<ext>`, vd `EQUIP-003_018.webm`.
- Khi sinh case mới: **để trống cột kết quả** (từ sau Expected Result).

## 2. Bảng ánh xạ Basic Design → Test case

| Phần trong Basic Design                                    | Sinh case ở section    | Loại case                                                                     |
|------------------------------------------------------------|------------------------|-------------------------------------------------------------------------------|
| `2. Overview` (popup, đi từ đâu, URL)                      | S03 Di chuyển màn hình | Luồng vào màn, URL, title, back                                               |
| `5.1 First load` + phân quyền (Read/Edit/Delete, engineer) | S04 Hiển thị khởi tạo  | Permission matrix, redirect chưa login (E-MSG-005)                            |
| `3. Screen Items` (mỗi field)                              | S04/S05                | Item type / Default / Disable-autogen / điều kiện enable / Click-Input-Select |
| Inline validation trong Description + `6. Validation`      | S05 (validation FE)    | Boundary value + error message (map MSG_ID)                                   |
| `5.2 Save / 5.3 Copy / 5.4 Delete / 5.5 Remove`            | S05 sau thao tác       | Popup confirm (はい/いいえ) + toast thành công/thất bại                            |
| `7. Log`                                                   | Log                    | Ghi log từng action × thành công/thất bại                                     |

> Mã section (`S03`, `S04`...) là quy ước SQA của team; màn không-list (popup detail như EQUIP-004) có thể không có S12. Giữ tên nhóm tiếng Việt y như mẫu trong `report/template/*.md`.

> ⚖️ **COMMON: phân biệt phần CHUNG (bỏ) vs phần ĐẶC THÙ màn (giữ).** Chỗ ref "Tham khảo/Refer COMMON-xxx":
> - **Bỏ** phần logic/thao tác **chung** đã có test ở màn COMMON (vd cách mở popup pagination, cơ chế favorite, luồng download chung).
> - **GIỮ + sinh case** cho phần **cấu hình/giá trị đặc thù của chính màn này** nêu trong spec.
>
> Cụ thể các section sau **KHÔNG bỏ qua** vì chứa cấu hình riêng màn:
> - **Display setting / View Config**: `default_view_config` (những cột nào, **thứ tự** hiển thị), cột mặc định ẩn/hiện, `screen_name`, cột cố định (fixed) — sinh case kiểm các giá trị này đúng theo spec màn.
> - **Export CSV / Excel**: những cột nào được export, thứ tự cột, định dạng/tên file theo màn (nếu spec ghi); bỏ cơ chế download chung.
> - Section chỉ ghi mỗi "Tham khảo COMMON-xxx" mà **không có gì đặc thù** (vd `5.3 Export CSV` chỉ trỏ COMMON-003.4) → mới bỏ hẳn.
>
> Vd EQUIP-003: `5.8 display setting` có `default_view_config` (danh sách cột + thứ tự) → **sinh case** cho cấu hình cột mặc định đó. Favorite/save_search thuần COMMON, không cấu hình riêng → bỏ. Log read/access/search của màn (ghi thẳng format trong spec) → giữ.

## 3. Kỹ thuật thiết kế case (áp dụng cho mỗi field)

- **Boundary value**: với mọi giới hạn → test ở `n-1`, `n`, `n+1`.
  Vd `serial_number` ≤ 50 → nhập 49 / 50 / 51 ký tự; `remarks` ≤ 1000 → 999/1000/1001;
  `management_unit` số nguyên dương 3 chữ số → 0 / 1 / 999 / 1000 / số âm / chữ.
- **Equivalence partition**: 1 case input hợp lệ + 1 case không hợp lệ cho mỗi field.
- **Decision table**: field phụ thuộc điều kiện (vd `usage_purpose` chỉ enable khi đã chọn `equipment_master_name`;
  `planned_update_date` = `manufacture_date` + `recommended_replacement_years`, có nhánh null).
- **State/flow**: mỗi popup confirm → 1 case はい (apply) + 1 case いいえ (cancel) + nhánh thành công/thất bại.
- **Permission matrix**: Read-only / Edit / Delete × engineer phụ trách / engineer kiểm tra.

## 4. Case UI/Style theo Figma (khi có)

`1. Interface` của Basic Design có link **Figma** (và đôi khi Draw.io). Khi có Figma, sinh thêm
case kiểm tra style ở section S04 (Layout/Item type), mức chi tiết tùy nguồn:

- **Có MCP Figma** (truy được giá trị design thật của node): mỗi item/text chính → case ghi rõ
  giá trị mong đợi: `fontSize`, `fontWeight`, `color` (mã hex), `lineHeight`, `spacing/padding`,
  `alignment`, kích thước button/icon. Vd: *"Kiểm tra `title`: fontSize=16px, fontWeight=700, color=#000000"*.
- **Chỉ có link Figma** (không có MCP): sinh case **checklist đối chiếu** — mỗi item chính → 1 case
  *"Font/size/weight/color/spacing/alignment của `<item>` khớp Figma: `<link>`"*, kèm link trong Steps.
- **Không có Figma**: giữ case layout chung như mẫu (giống wireframe, không vỡ layout sau thao tác).

Các thuộc tính style nên phủ: font-family, font-size, font-weight, color/background, line-height,
letter-spacing, padding/margin, border, alignment, kích thước & trạng thái (normal/hover/disabled).
