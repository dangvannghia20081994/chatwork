# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mục đích của repo

`rezil-support` là bộ công cụ hỗ trợ dự án Rezil: đọc **Basic Design** / **mẫu test case** rồi sinh ra **test case (UT/IT)** và **code (LIB/BE/FE)** theo đúng convention của team. Nguồn dữ liệu là **Google Sheet đọc trực tiếp qua MCP** — không còn export HTML.

> ⚠️ **MCP server**: dùng **`gsheets-rezil`** (`mcp__gsheets-rezil__*`, service account `~/.config/gcloud/rezil-agent.json`), KHÔNG phải `gsheets` thường. Mọi file BD / test case phải được **share cho email service account đó** (Viewer), nếu không sẽ lỗi 403.

## Trạng thái hiện tại

Repo này vừa là nơi phát triển, vừa là **marketplace plugin nội bộ** để team cài dùng ở nhiều repo khác mà không cần clone.

- `.claude-plugin/marketplace.json` — khai báo marketplace `rezil-support` + danh sách plugin.
- `plugins/<tên>/` — mỗi plugin: `.claude-plugin/plugin.json`, `skills/<tên>/SKILL.md`, `scripts/...`. Các plugin hiện có:
  - **`read-basic-design`** — đọc & tóm tắt spec 1 màn từ Basic Design; ghi `report/design/<Screen>.md`.
  - **`read-testcase-template`** — trích template UT/IT từ file mẫu → `report/template/{ut,it}.md`.
  - **`gen-testcase`** — sinh UT/IT test case cho 1 màn (đọc lại các file `.md` trung gian trên).
  - **`gen-code`** — sinh code LIB/BE/FE (web + mobile) cho 1 màn/feature từ Basic Design hoặc mô tả, theo convention thật của các repo code Rezil ESMS.

Team cài: `/plugin marketplace add <git-url repo này>` rồi `/plugin install <tên-plugin>@rezil-support`.

**Thêm skill mới** = tạo thêm `plugins/<skill-mới>/` (cùng cấu trúc) + 1 entry trong `marketplace.json`. Không tách repo. Script của plugin phải gọi qua `${CLAUDE_PLUGIN_ROOT}` (plugin được copy vào cache khi cài, không tham chiếu file ngoài thư mục plugin bằng `../`). Validate bằng `claude plugin validate .`.

## Mô hình dữ liệu — Google Sheet qua MCP

Các plugin đọc input **đọc thẳng Google Sheet qua MCP `gsheets-rezil`** (`mcp__gsheets-rezil__get_sheet_data`, `mcp__gsheets-rezil__list_sheets`), không còn parse HTML/không còn script Python.

**3 spreadsheet nguồn (config cố định — quy ước 1 tab = 1 màn, tên tab = tên màn):**

| Vai trò                             | Spreadsheet ID                                 | Ghi chú                                                                 |
| ----------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| **REZIL - Basic Design Web Admin**  | `1ABO6soPFhw9zFUUFgCnqEDSscw7ihmXosa_ETEmOoO8` | Spec màn admin; mỗi tab 1 màn (vd `CLIENT-001 Client List`)             |
| **REZIL - Basic Design Mobile**     | `15cDzvbNfkzFGCMNSGGeFc3lSmCai4iqh-TsnliCSUPU` | Spec màn mobile (`MOB-xxx`)                                             |
| **REZIL - Test Plan - Test Report** | `1YJa5iFt74z_bw0GfWy2CObK7JldkHfBbXRLDRwaQ86w` | Test case thật: IT ở tab `<CODE Tên màn>`, UT ở tab `UT_<CODE Tên màn>` |

- **Rule**: viết test case cho màn "X" → đọc tab tên "X" trong file Basic Design tương ứng (Web Admin / Mobile). Spreadsheet ID ghi trong SKILL.md của `read-basic-design` (2 file BD) và `read-testcase-template` (file Test Plan); đổi nguồn thì sửa 2 file đó.
- **Basic Design (tab 1 màn)** chia theo section đánh số: `1. Interface` (Figma/Mockup/DrawIO/Spec), `2. Overview`, `3. Screen Items` (bảng field: `Spec-ID | Field Name | Label Name | Data Type | Display Type | Required | Value | Description`), `4. Database`, `5. 処理` (event + flow + SQL + validation + error `E-MSG-xxx`), `6. Validation`, `7. Log`, `8. Out of scope`, `9. Other`.
- **Test case mẫu (file Test Plan)**: header block (metadata: Total TCs, Screen Code_Name...) → hàng cột bắt đầu `TC No.`; 7 cột chung (`TC No. → Expected Result`), rồi cụm kết quả — **IT**: `Test IT Result | Executed Date | SQA | Evidence | Note`; **UT**: `Test UT Result | Executed Date | Status fix bug | DEV | Note | Bug Severity`. Section: IT dùng tiêu đề chữ (`Kiểm tra_...`), UT dùng `Sxx_...` và bóc nhỏ hơn (thêm case browser F5/Back/Next, mỗi item nhiều khía cạnh).

**Cách đọc values từ MCP**: mỗi phần tử `values` là 1 hàng (list cell theo cột A, B, C...). Cột A thường trống (thụt lề) → **bỏ cell rỗng ở đầu hàng**; bỏ hàng rỗng. Section header BasicDesign khớp `^\d+(\.\d+)*`; hàng cột test case bắt đầu bằng `TC No.`. Không còn artifact "hàng A/B/C" như bản HTML.

## Ghi chú

- `README.md` được viết bằng tiếng Việt; giữ nguyên ngôn ngữ này khi chỉnh sửa.

### Rule format Markdown table (áp cho MỌI file `.md` — hiện tại & sinh sau này)

Mọi bảng trong file `.md` (design, template, test case, docs) phải là **GFM table căn cột chuẩn**:

- Mỗi bảng có **hàng header** + **hàng separator** `| --- | --- |`; mọi hàng **cùng số cột**.
- **Căn cột (pad)**: các dấu `|` thẳng hàng theo cột, pad theo **bề rộng hiển thị** — ký tự CJK/tiếng Nhật tính **= 2** (không phải theo số ký tự, nếu không IDE báo "Table is not correctly formatted"); mỗi cột rộng tối thiểu 3 dấu `-`.
- **Không** xuống dòng thật trong 1 cell → nội dung nhiều bước viết inline `1) ... 2) ...`; ký tự `|` trong cell phải escape `\|`.
- Nội dung dài/nhiều dòng (SQL, mô tả) để **ngoài bảng** trong code fence, hoặc rút gọn trong cell.
- Khi sinh/sửa `.md` xong, đảm bảo bảng đã căn cột trước khi kết thúc (có thể format lại toàn bộ bảng).


## Follow — pipeline tổng (end-to-end nối các plugin)

Luồng làm việc đầy đủ cho 1 màn/feature, nối các skill trong marketplace:

```
1. Read input (chuẩn bị dữ liệu — chạy SONG SONG, đứng ở repo rezil-support)
   ├─ Read basic design   → /read-basic-design  (đọc tab BasicDesign qua MCP → ghi report/design/<Screen>.md)
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

- **Bước 1–2 chạy ở repo `rezil-support`** (nơi có `report/`, các plugin; input đọc từ Google Sheet qua MCP). Đọc input song song được vì độc lập.
- **Figma là bước tùy chọn**, không phải skill riêng: chưa có plugin đọc Figma. Có MCP Figma thì lấy giá trị thật (font/màu/spacing) cho case UI & code style; không thì chỉ dùng link trong Basic Design.
- **Bước 3 (gen-code) phải chạy với cwd là repo code đích** (`rezil-esms/be-api`, `rezil-esms/app`, `rezil-esms-lib`, hoặc bản mobile) để dò được convention & ghi file đúng chỗ — KHÔNG chạy ở `rezil-support`. File `report/design/<Screen>.md` (sinh ở bước 1) cần copy/đường dẫn tới được, hoặc gọi lại `/read-basic-design`.
- Trong **gen-code**: **LIB** ‖ **FE mockup** song song; **BE** cần LIB xong; **OpenAPI/aspida** cần BE xong; **Integrate** là pha cuối — ghép aspida client thật vào FE mockup. Chi tiết convention từng layer + web/mobile xem `plugins/gen-code/skills/gen-code/SKILL.md`.