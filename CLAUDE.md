# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mục đích của repo

`rezil-support` là công cụ hỗ trợ làm **báo cáo hàng ngày** cho dự án Rezil. Báo cáo nguồn là các Google Sheet được export ra HTML và đặt vào thư mục sprint (ví dụ `Rezil MVP2-B - Sprint 15/`) để parse/phân tích, sau đó sinh ra nội dung báo cáo dán vào **Chatwork**.

## Trạng thái hiện tại

Repo này vừa là nơi phát triển, vừa là **marketplace plugin nội bộ** để team cài dùng ở nhiều repo khác mà không cần clone.

- `.claude-plugin/marketplace.json` — khai báo marketplace `rezil-support` + danh sách plugin.
- `plugins/<tên>/` — mỗi plugin: `.claude-plugin/plugin.json`, `skills/<tên>/SKILL.md`, `scripts/...`. Các plugin hiện có:
  - **`report-plan`** — báo cáo tiến độ daily từ folder HTML export → nội dung dán Chatwork.
  - **`read-basic-design`** — đọc & tóm tắt spec 1 màn từ Basic Design; ghi `report/design/<Screen>.md`.
  - **`read-testcase-template`** — trích template UT/IT từ file mẫu → `report/template/{ut,it}.md`.
  - **`gen-testcase`** — sinh UT/IT test case cho 1 màn (đọc lại các file `.md` trung gian trên).
  - **`gen-code`** — sinh code LIB/BE/FE (web + mobile) cho 1 màn/feature từ Basic Design hoặc mô tả, theo convention thật của các repo code Rezil ESMS.

Team cài: `/plugin marketplace add <git-url repo này>` rồi `/plugin install <tên-plugin>@rezil-support`.

**Thêm skill mới** = tạo thêm `plugins/<skill-mới>/` (cùng cấu trúc) + 1 entry trong `marketplace.json`. Không tách repo. Script của plugin phải gọi qua `${CLAUDE_PLUGIN_ROOT}` (plugin được copy vào cache khi cài, không tham chiếu file ngoài thư mục plugin bằng `../`). Validate bằng `claude plugin validate .`.

## Mô hình dữ liệu — thư mục HTML export

Mỗi thư mục sprint chứa một file HTML cho mỗi tab Google Sheet, kèm thư mục `resources/` (file `sheet.css` dùng chung và JS cho chart). Các bản export này bị gitignore (`Rezil*/`) — chúng là dữ liệu đầu vào để xử lý, không phải source code.

HTML là markup dạng bảng "ritz/waffle" của Google: dữ liệu nằm trong các ô `<table>`, mỗi `<tr>` là một hàng. Hãy **parse cấu trúc bảng (td theo thứ tự), không dựa vào inline style**. Hàng/cột rỗng (cell trống) xuất hiện nhiều — cần lọc bỏ.

### Cấu trúc các sheet chính

Mỗi sheet có một hàng header chứa các ngày làm việc (vd `2026/06/01`, `2026/06/02`, ... bỏ qua cuối tuần), cột `Start` là giá trị ngày đầu sprint, và các cột ngày sau là giá trị **remaining giảm dần** (về 0 nghĩa là xong task đó trong ngày).

- **Overview** — bảng tổng hợp toàn sprint theo ngày: các hàng `Expect`, `Actual`, `Done`, `% Expect`, `% Done`, `Forecast`, `Today Expect`, `Today Actual`. Có `Past Velocity`. Đây là nguồn cho phần tổng quan + burndown.
- **Expect** — mỗi hàng là một task con (vd `MYPAGE-001 My Page - 2. FE`) với `ID`, `Estimate`, `Assignee`, `Start`, rồi remaining **kế hoạch** theo từng ngày.
- **Actual** — cùng cấu trúc Expect (`ID`, `Assignee`, `Start`, remaining theo ngày) nhưng là số **thực tế**. So sánh Actual vs Expect theo từng ngày để biết chậm/nhanh.

Một ticket (vd `MYPAGE-001`) gồm nhiều task con theo pha: BE, FE, UT Testcase/Execute/Fix, IT Testcase/Execute/Fix/Retest. Assignee gắn theo từng task con, không phải theo ticket.

Các tab khác (Todo, Done, Progress_*, Context, Combine, Different, Metadata, ...) là sheet nguồn/hỗ trợ cho ba sheet trên.

## Luồng xử lý (plugin `report-plan`)

1. **Đọc folder HTML** sprint mới nhất → parse Overview, Expect, Actual.
   - Báo cáo dựa trên **cột ngày tương ứng với ngày hiện tại** (cột có header `YYYY/MM/DD` khớp hôm nay), không lấy cột cuối cùng.
2. **Phân tích & đưa ra báo cáo**:
   - Theo **ticket**: ticket nào chậm, ticket nào nhanh hơn so với expect (so sánh Actual vs Expect).
   - Theo **member**: mỗi member chậm bao nhiêu giờ, chậm ở (các) ticket nào, ...
3. **Sinh nội dung Chatwork**: định dạng sẵn để tôi copy dán thẳng vào Chatwork.

## Ghi chú

- `README.md` được viết bằng tiếng Việt; giữ nguyên ngôn ngữ này khi chỉnh sửa.
- Định dạng/quy tắc báo cáo "chuẩn" do người dùng chốt được ghi vào `plugins/report-plan/skills/report-plan/SKILL.md`; khi người dùng góp ý, cập nhật file đó để lần sau chỉ cần gọi lệnh.


## Follow — pipeline tổng (end-to-end nối các plugin)

Luồng làm việc đầy đủ cho 1 màn/feature, nối các skill trong marketplace:

```
1. Read input (chuẩn bị dữ liệu — chạy SONG SONG, đứng ở repo rezil-support)
   ├─ Read basic design   → /read-basic-design  (ghi report/design/<Screen>.md)
   ├─ Read Figma          → (tùy chọn) lấy giá trị style qua MCP Figma nếu đã kết nối;
   │                         không có MCP thì chỉ giữ link Figma ở "1. Interface" để đối chiếu thủ công
   └─ Read testcase template → /read-testcase-template (ghi report/template/{ut,it}.md)

2. Gen testcase            → /gen-testcase   (đọc design + template ở bước 1 → UT/IT case)

3. Gen code                → /gen-code  (đọc design ở bước 1; PHẢI chạy khi cwd là repo code đích)
   ├─ Gen code LIB        ─┐  (SONG SONG với FE mockup)
   ├─ Gen code FE (mockup) ┘  (dựng UI + state + validation với data giả, chưa gọi API thật)
   ├─ Gen code BE             (sau khi LIB xong; chốt hợp đồng API)
   ├─ Tạo OpenAPI & build aspida  (spec khớp BE → regenerate client aspida)
   └─ Integrate API BE↔FE     (thay data giả ở FE mockup bằng aspida client vừa build)
```

- **Bước 1–2 chạy ở repo `rezil-support`** (nơi có `report/`, các plugin, file HTML export). Đọc input song song được vì độc lập.
- **Figma là bước tùy chọn**, không phải skill riêng: chưa có plugin đọc Figma. Có MCP Figma thì lấy giá trị thật (font/màu/spacing) cho case UI & code style; không thì chỉ dùng link trong Basic Design.
- **Bước 3 (gen-code) phải chạy với cwd là repo code đích** (`rezil-esms/be-api`, `rezil-esms/app`, `rezil-esms-lib`, hoặc bản mobile) để dò được convention & ghi file đúng chỗ — KHÔNG chạy ở `rezil-support`. File `report/design/<Screen>.md` (sinh ở bước 1) cần copy/đường dẫn tới được, hoặc gọi lại `/read-basic-design`.
- Trong **gen-code**: **LIB** ‖ **FE mockup** song song; **BE** cần LIB xong; **OpenAPI/aspida** cần BE xong; **Integrate** là pha cuối — ghép aspida client thật vào FE mockup. Chi tiết convention từng layer + web/mobile xem `plugins/gen-code/skills/gen-code/SKILL.md`.