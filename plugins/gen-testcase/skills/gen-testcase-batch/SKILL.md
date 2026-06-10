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
- **Folder**: Web Admin hay Mobile (mặc định Web Admin).
- **Loại**: UT, IT, hay cả hai (mặc định cả hai).
- **Số lượng case mỗi màn** (tùy chọn): vd "EQUIP-003 400UT 300IT". Nếu **không nêu** → tự quyết theo Basic Design (đủ phủ, không ép số).

⚠️ Nhiều màn = rất tốn token (mỗi màn ≥2 subagent sinh hàng trăm dòng). Nếu danh sách dài (>5 màn), cảnh báo người dùng và đề nghị chạy thử vài màn trước.

## Bước 2 — Chuẩn bị dùng chung (1 lần)

- Đảm bảo có `report/template/ut.md` + `report/template/it.md` → nếu thiếu, gọi skill `/read-testcase-template`.

## Bước 3 — Fan-out mỗi màn

Với mỗi màn, dùng tool **Agent** (subagent) để chạy độc lập, song song. Gửi nhiều Agent trong 1 lượt để chạy đồng thời. Mỗi subagent làm:

1. Tìm file `.html` của màn trong folder Basic Design, chạy `read-basic-design` (script với `--full --write`) → `report/design/<Screen>.md`.
2. Sinh UT và/hoặc IT theo `gen-testcase`: đọc `report/design/<Screen>.md` + `report/template/<ut|it>.md` + `template.md`, ghi CSV ra `report/testcase/<Screen>-<UT|IT>.csv`.

> 🔁 **Đạt đủ số lượng**: nếu người dùng nêu số case mục tiêu (vd 400 UT), subagent phải **sinh tiếp đến khi đủ** — không dừng sớm khi mới phủ spec cơ bản. Đủ số thì mở rộng thêm boundary/decision/permission/UI. (Kinh nghiệm: subagent hay dừng trước mục tiêu lớn — nhắc rõ trong prompt và kiểm lại số dòng sau khi xong.)

## Bước 4 — Tổng hợp

- Đếm số case thực tế mỗi file (dòng có TC No. là số). Báo cho người dùng: màn nào / loại nào / bao nhiêu case / đường dẫn CSV.
- Nêu màn nào lỗi hoặc **chưa đạt số mục tiêu** để chạy bù.

## Ghi chú triển khai

- Không hard-code đường dẫn tuyệt đối. Folder dữ liệu (`REZIL - Basic Design ...`, `REZIL - Testcase/`) ở thư mục làm việc hiện tại; script đọc qua `${CLAUDE_PLUGIN_ROOT}` của từng plugin.
- Đây là bản "skill hóa" của workflow `scripts/wf-gen-testcase.js` (workflow đó chỉ chạy trong repo rezil-support; skill này chạy được ở mọi nơi sau khi cài plugin).
