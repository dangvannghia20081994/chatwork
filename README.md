# Rezil-support
Giúp hỗ trợ trong việc báo cáo hàng ngày
## Đọc nội dung từ Folder html (được download từ google sheet về)
- Các file chính cần quan tâm:
  + Overview: tổng hợp, báo cáo từ các sheet liên quan
  + Expect: Chứa estimate của từng ticket theo member, date
  + Actual: Thời gian mà member giảm dần theo từng ngày
- Báo cáo với column tương ứng với ngày hiện tại
## Sau khi đọc được hết nội dung từ folder
- Đưa ra được báo cáo về tình hình các ticket: Ticket nào chậm, ticket nào nhanh hơn cho với expect
- Đưa ra báo cáo về tình hình của từng member: Chậm bao nhiêu giờ, chậm ticket nào, ...
## Sau khi có được báo cáo
- Đưa ra nội dung hỗ trợ trong chartwork để tôi có thể copy

## Các plugin trong marketplace

Repo này là marketplace plugin nội bộ `rezil-support`, gồm:

| Plugin | Skill | Việc | Phụ thuộc |
|---|---|---|---|
| `report-plan` | `/report-plan` | Báo cáo tiến độ daily → nội dung Chatwork | (độc lập) |
| `read-basic-design` | `/read-basic-design` | Tóm tắt spec 1 màn; ghi `report/design/<Screen>.md` | (độc lập) |
| `read-testcase-template` | `/read-testcase-template` | Trích template UT/IT → `report/template/{ut,it}.md` | (độc lập) |
| `gen-testcase` | `/gen-testcase`, `/gen-testcase-batch` | Sinh UT/IT test case cho 1 màn / nhiều màn | **cần** `read-basic-design` + `read-testcase-template` |
| `gen-code` | `/gen-code` | Sinh code FE/BE/LIB theo convention repo | **cần** `read-basic-design` (khi gen từ Basic Design) |

> ⚠️ `gen-testcase` và `gen-code` đọc file `.md` trung gian do `read-basic-design` / `read-testcase-template` sinh ra; khi thiếu chúng sẽ gọi `/read-basic-design`, `/read-testcase-template`. **Nên cài cả cụm** (read-basic-design + read-testcase-template + gen-testcase + gen-code) cùng nhau. `report-plan` cài riêng cũng được.

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

# cài plugin cần dùng (report-plan độc lập; cụm test case cài cả 3)
/plugin install report-plan@rezil-support
/plugin install read-basic-design@rezil-support
/plugin install read-testcase-template@rezil-support
/plugin install gen-testcase@rezil-support
```

Sau đó dùng `/report-plan`, `/read-basic-design`, `/gen-testcase`... ở bất kỳ project nào (đặt folder HTML nguồn vào thư mục làm việc trước khi chạy).