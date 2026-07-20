# Rezil-support

Bộ công cụ hỗ trợ dự án Rezil: đọc **Basic Design** / **mẫu test case** rồi sinh **test case (UT/IT)** và **code (LIB/BE/FE)** theo convention của team.

## Nguồn dữ liệu — Google Sheet qua MCP

- Input đọc **trực tiếp Google Sheet qua MCP `gsheets-rezil`** (`mcp__gsheets-rezil__*`, service account `~/.config/gcloud/rezil-agent.json`) — không còn export HTML, không còn script parse. File phải **share Viewer cho email service account** đó (nếu không → 403).
- **Quy ước**: 1 tab = 1 màn, tên tab = tên màn (vd `CLIENT-001 Client List`). 3 spreadsheet nguồn:

| Vai trò                         | Spreadsheet                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| REZIL - Basic Design Web Admin  | [1ABO6so…](https://docs.google.com/spreadsheets/d/1ABO6soPFhw9zFUUFgCnqEDSscw7ihmXosa_ETEmOoO8/edit) |
| REZIL - Basic Design Mobile     | [15cDzvb…](https://docs.google.com/spreadsheets/d/15cDzvbNfkzFGCMNSGGeFc3lSmCai4iqh-TsnliCSUPU/edit) |
| REZIL - Test Plan - Test Report | [1YJa5iF…](https://docs.google.com/spreadsheets/d/1YJa5iFt74z_bw0GfWy2CObK7JldkHfBbXRLDRwaQ86w/edit) |

- BD: IT test case ở tab `<CODE Tên màn>`, UT ở tab `UT_<CODE Tên màn>` (file Test Plan).
- Đổi nguồn → sửa spreadsheet ID trong `SKILL.md` của `read-basic-design` (2 file BD) và `read-testcase-template` (file Test Plan).

## Các plugin trong marketplace

Repo này là marketplace plugin nội bộ `rezil-support`, gồm:

| Plugin                   | Skill                                  | Việc                                                | Phụ thuộc                                              |
| ------------------------ | -------------------------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| `read-basic-design`      | `/read-basic-design`                   | Tóm tắt spec 1 màn; ghi `report/design/<Screen>.md` | (độc lập)                                              |
| `read-testcase-template` | `/read-testcase-template`              | Trích template UT/IT → `report/template/{ut,it}.md` | (độc lập)                                              |
| `gen-testcase`           | `/gen-testcase`, `/gen-testcase-batch` | Sinh UT/IT test case cho 1 màn / nhiều màn          | **cần** `read-basic-design` + `read-testcase-template` |
| `gen-code`               | `/gen-code`                            | Sinh code FE/BE/LIB theo convention repo            | **cần** `read-basic-design` (khi gen từ Basic Design)  |

> ⚠️ `gen-testcase` và `gen-code` đọc file `.md` trung gian do `read-basic-design` / `read-testcase-template` sinh ra; khi thiếu chúng sẽ gọi `/read-basic-design`, `/read-testcase-template`. **Nên cài cả cụm** (read-basic-design + read-testcase-template + gen-testcase + gen-code) cùng nhau.

## Cài plugin khi repository để private

Khi repo **private**, plugin **vẫn dùng được** miễn là mỗi người có quyền đọc repo và đã cấu hình git auth (như khi clone private repo bình thường).

Điều kiện:
1. Thành viên được cấp quyền đọc repo (add vào private repo / tổ chức).
2. Máy đã thiết lập git auth — chọn 1 trong:
   - **SSH**: đã thêm SSH key vào tài khoản git.
   - **Credential helper**: đã đăng nhập (vd `gh auth login`).
   - **Token**: đặt biến môi trường `GITHUB_TOKEN` (Personal Access Token có quyền đọc repo). Bắt buộc nếu muốn plugin **tự động cập nhật**.

Cài đặt (trong Claude Code):
```
# nếu đã auth qua gh
/plugin marketplace add <owner>/rezil-support
# hoặc dùng SSH URL
/plugin marketplace add git@github.com:<owner>/rezil-support.git

# cài plugin cần dùng (cụm test case cài cả 3)
/plugin install read-basic-design@rezil-support
/plugin install read-testcase-template@rezil-support
/plugin install gen-testcase@rezil-support
```

Sau đó dùng `/read-basic-design`, `/gen-testcase`... ở bất kỳ project nào (cần đã kết nối MCP Google Sheet để đọc spreadsheet nguồn).