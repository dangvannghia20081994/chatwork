---
name: gen-testcase-batch
description: Sinh UT/IT test case cho NHIỀU màn Rezil cùng lúc bằng cách fan-out subagent (mỗi màn một nhánh song song). Dùng khi người dùng muốn gen test case hàng loạt cho danh sách màn, hoặc gõ /gen-testcase-batch.
---

# gen-testcase-batch — Sinh test case hàng loạt (fan-out subagent)

Mục tiêu: nhận **danh sách màn** → mỗi màn chạy quy trình của skill `gen-testcase` (đọc Basic Design → sinh UT/IT) → chạy **song song** bằng subagent để nhanh.

Skill này điều phối; logic sinh case từng màn vẫn theo `gen-testcase` (xem SKILL của nó + `template.md`).

## Bước 1 — Thu thập đầu vào

Hỏi/parse từ yêu cầu người dùng:
- **Danh sách màn**: mã/tên màn (vd `EQUIP-003 Equipment List`, `CLIENT-001`...). Bắt buộc.
- **Nguồn BD**: Web Admin hay Mobile — `read-basic-design` tự chọn theo mã màn (`MOB-` → Mobile, còn lại → Web Admin); chỉ hỏi khi mơ hồ.
- **Loại**: UT, IT, hay cả hai (mặc định cả hai).
- **Định dạng xuất**: `.md` (review) hay `.csv` (import Sheet).
- **Số lượng case mỗi màn** (🔢 BẮT BUỘC chốt trước khi sinh): vd "EQUIP-003 400UT 300IT". Nếu người dùng **chưa nêu**, sau khi đọc BD từng màn → **đưa gợi ý ước tính** (UT ~x–y, IT ~m–n, xem cách ước tính trong SKILL `gen-testcase` Bước 1) rồi hỏi; người dùng nói "tự quyết" thì dùng số đề xuất (đủ phủ, không ép số).

⚠️ Nhiều màn = rất tốn token (mỗi màn ≥2 subagent sinh hàng trăm dòng). Nếu danh sách dài (>5 màn), cảnh báo người dùng và đề nghị chạy thử vài màn trước.

## Bước 2 — Chuẩn bị dùng chung (1 lần)

- Đảm bảo có `report/template/ut.md` + `report/template/it.md` → nếu thiếu, gọi skill `/read-testcase-template`.

## Bước 3 — Fan-out mỗi màn

Với mỗi màn, dùng tool **Agent** (subagent) để chạy độc lập, song song. Gửi nhiều Agent trong 1 lượt để chạy đồng thời. Mỗi subagent làm:

1. Gọi `read-basic-design` cho màn (đọc tab **tên màn** qua MCP `gsheets-rezil`) → `report/design/<Screen>.md`.
2. Sinh UT và/hoặc IT theo `gen-testcase`: đọc `report/design/<Screen>.md` + `report/template/<ut|it>.md` + `template.md`, ghi ra `report/testcase/<Screen>_<UT|IT>.<md|csv>` theo định dạng đã chọn. Bảng `.md` phải **căn cột chuẩn** (xem rule format table).

> 🔁 **Đạt đủ số lượng**: nếu người dùng nêu số case mục tiêu (vd 400 UT), subagent phải **sinh tiếp đến khi đủ** — không dừng sớm khi mới phủ spec cơ bản. Đủ số thì mở rộng thêm boundary/decision/permission/UI. (Kinh nghiệm: subagent hay dừng trước mục tiêu lớn — nhắc rõ trong prompt và kiểm lại số dòng sau khi xong.)

## Bước 4 — Tổng hợp

- Đếm số case thực tế mỗi file (dòng có TC No. là số). Báo cho người dùng: màn nào / loại nào / bao nhiêu case / đường dẫn file.
- Nêu màn nào lỗi hoặc **chưa đạt số mục tiêu** để chạy bù.

## Ghi chú triển khai

- Không hard-code đường dẫn tuyệt đối. Nguồn dữ liệu là Google Sheet đọc qua MCP (`mcp__gsheets-rezil__*`); spreadsheet ID cấu hình trong SKILL của `read-basic-design` / `read-testcase-template`.
- Skill này chỉ **điều phối fan-out** của `gen-testcase` (mỗi màn 1 subagent song song); mọi rule sinh case (số lượng, format table, convention) theo SKILL `gen-testcase`.
