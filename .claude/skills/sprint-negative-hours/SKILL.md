---
name: sprint-negative-hours
description: Tính "giờ âm" (vượt kế hoạch) từ file Excel burndown sprint Rezil (Rezil MVP2-* Sprint NN.xlsx). So sánh sheet Expect vs Actual theo cột ngày (mặc định hôm nay), bắt các ticket có Actual > Expect, gom theo từng người và ra tổng giờ âm. Dùng khi user nói "giờ âm", "so expect actual", "ticket âm", "vượt kế hoạch", "burndown sprint", hoặc upload file sprint xlsx và muốn check chênh lệch theo ngày/người.
---

# Sprint negative-hours

Báo cáo **giờ âm** = phần Actual vượt Expect, gom theo người, theo workflow quen thuộc của team Rezil.

## File đầu vào

Excel burndown sprint (vd `Rezil MVP2-B - Sprint 17.xlsx`), có các sheet cùng layout — header ở **dòng 1**:

```
A:Type  B:Team  C:Parent ID  D:ID  E:Category  F:Note
G:Estimate  H:Debuffer  I:Assignee  J:Start  K..→ các cột NGÀY (header = số serial Excel, vd 46202=2026-06-29)
```

Skill chỉ dùng 2 sheet: **Expect** (kế hoạch) và **Actual** (thực tế). Ghép dòng theo cột **ID** (D), người theo **Assignee** (I).

## Quy tắc tính (đúng cách team làm)

1. Chọn **cột ngày** (mặc định = ngày hiện tại).
2. Với mỗi ticket: nếu **Actual có dữ liệu (>0) VÀ Actual > Expect** → phần vượt `= Actual − Expect` là **giờ âm** (Expect trống = 0).
3. Gom theo **từng người** → danh sách ticket âm + **tổng giờ âm** của người đó.
4. Cộng tổng toàn đội.

## Cách chạy

```bash
node .claude/skills/sprint-negative-hours/compare.js \
  --file ".ai-uploads/Rezil MVP2-B - Sprint 17.xlsx"
```

- Không truyền `--file` → tự lấy file `.xlsx` **mới nhất** trong `ui-next/.ai-uploads/` hoặc `.ai-uploads/`.
- Không truyền ngày → **hôm nay**.
- `--date 2026-06-29` hoặc `--serial 46202` → check ngày cụ thể.
- `--all` → cộng dồn giờ âm qua **mọi ngày** trong sprint (mỗi dòng ghi rõ ngày).
- `--json` → in thêm khối JSON cho máy đọc.
- `--chatwork` (hay `--cw`) → in ra **format Chatwork** để copy gửi report (xem dưới).

### Output Chatwork (`--chatwork`)

In ra block sẵn để dán vào Chatwork:

```
[To:6040320]Le Ngoc Chien
Em gửi Report Actual Sprint ạ
[info]
Member đã update thời gian làm việc cho ngày DD/MM
SPRINT NN:
<link Google Sheet>
NG có trong file
- <Người> => âm <X>h
  + <Ticket> (Expect .. / Actual ..) — (lý do...)
[/info]
```

- `--to "ID:Tên"` → người nhận (mặc định `6040320:Le Ngoc Chien`).
- `--sprint NN` → số sprint (mặc định tự đọc từ tên file `... Sprint 17.xlsx`).
- `--link <url>` → link sheet (nếu bỏ trống in placeholder để tự dán).
- **Lý do** không tự sinh được → skill in sẵn ticket gây âm + chỗ `(lý do...)` để user điền tay.

Logic tính nằm ở **`ui-next/lib/sprint.js`** (nguồn duy nhất, dùng chung với web tool). `compare.js` chỉ là vỏ CLI dynamic-import lib đó; `xlsx` tự resolve từ `ui-next/node_modules`. Nếu báo thiếu: `cd ui-next && npm i xlsx`.

> Bản web tương đương: trang **`/sprint`** (upload Excel → ra Chatwork, không cần Bash). Dùng khi thao tác trên UI; skill này dùng khi làm ở terminal.

## Khi dùng

1. Xác định file (hỏi user nếu mơ hồ, không thì lấy file mới nhất) và ngày cần check.
2. Chạy script, **trình bày kết quả dạng bảng** theo từng người (Ticket | Expect | Actual | Giờ âm | tổng), kèm tổng toàn đội.
3. Nhận xét ngắn (vd phần lớn là task ngoài plan Expect=0). Không bịa số — chỉ báo theo output script.
