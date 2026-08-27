# KLOC — spec màn /kloc

Console đọc Pull Request đã merge của 4 repo rezil, tính LoC từng PR rồi **append** vào Google Sheet
`REZIL - KLoc`. File này là source of truth, được ĐỌC LÚC CHẠY và nhúng nguyên văn vào system prompt
(cùng cơ chế như `app/evidence/SCREEN_EVIDENCE.md`) — sửa file này là đổi hành vi ngay lượt sau, không
cần build/restart.

Số liệu trong spec (dòng cuối, STT cuối) chỉ là mốc đo lúc viết spec — **mỗi lượt phải tự dò lại**.

---

## 1. Nguồn và đích

**Nguồn**: `gh` CLI, org `hybrid-tech-rezil`, 4 repo:
`rezil-esms`, `rezil-esms-lib`, `rezil-esms-mobile`, `rezil-esms-portal`.

**Đích**: spreadsheet `1UkianWTMWCpZaZgBQSC9DJnJqNfE8gwmTTEjQUE369A` (tên `REZIL - KLoc`,
timezone `Asia/Saigon`), tab **`KLoC-MVP2`** (`sheetId` = `2011708823`, đúng tab trong link user gửi).
Ghi qua MCP `mcp__gsheets-rezil__*` (service account `rezil-agent@rezil-agent.iam.gserviceaccount.com`
đã được share quyền Editor).

Cấu trúc tab `KLoC-MVP2`:

- Dòng 1 trống, **header ở dòng 2**, 2 dòng đầu bị freeze, dữ liệu từ **dòng 3**.
- 13 cột dùng thật: `A`..`M`. `STT` = số thứ tự liên tục **tăng dần**: luôn lấy `STT dòng cuối + 1`,
  KHÔNG tính theo số dòng (dữ liệu thật đang lệch: row 1631 → STT 1650, do lịch sử có dòng bị xoá).
- Mốc lúc viết spec: dòng cuối có dữ liệu = **1626** (STT **1645**, Log Date `2026/8/26`).
- Có `basicFilter` phủ `A1:M<dòng cuối>` và nhiều filter view của từng người — **không sửa, không xoá**
  filter; append xuống dưới vùng filter là bình thường.

Các tab khác **chỉ đọc**:

- `Metadata` — danh sách validation: cột A = Dev, cột B = Sprint (`Sprint 01`..`Sprint 32`, `Deploy`,
  `PreUAT`, `UAT`, `Common`, `PreUAT - MVP2-A`, `UAT-MVP2-A`, `PreUAT - MVP2-B`).
- `Overview - MVP2` — tổng hợp bằng `=SUMIF('KLoC-MVP2'!B:B, <Feature ID>, 'KLoC-MVP2'!G:G)` trên
  **cả cột**, nên dòng mới append vào là tự cộng, KHÔNG cần sửa Overview.
- `KLoC` (MVP1), `Summary` (đang `#REF!`).

---

## 2. Map 13 cột

| Cột | Header           | Nguồn                                                                |
|-----|------------------|----------------------------------------------------------------------|
| A   | `STT`            | `STT` của dòng cuối + 1 (đọc từ sheet, KHÔNG suy từ số dòng)         |
| B   | `Feature ID`     | token giữa `]` và `\|` trong PR title                                |
| C   | `Feature Name`   | phần sau `\|` trong PR title (giữ nguyên, gồm cả `REZIL-xxxx - `)    |
| D   | `PIC`            | map từ `author.login` — §5                                           |
| E   | `PR`             | URL PR dạng `https://github.com/hybrid-tech-rezil/<repo>/pull/<số>`  |
| F   | `Status`         | `Merged` (chỉ ghi PR đã merge — §3)                                  |
| G   | `LoC (New)`      | `additions` của PR                                                   |
| H   | `LoC (Modified)` | `deletions` của PR                                                   |
| I   | `LoC (Sum)`      | `additions + deletions` (ghi số, không ghi công thức)                |
| J   | `AI Usage (%)`   | số trong mục `## AI Usage` của PR description — §6                   |
| K   | `Log Date`       | ngày `mergedAt` theo giờ `Asia/Saigon`, `YYYY/MM/DD`                 |
| L   | `Last Update`    | cùng giá trị cột K                                                   |
| M   | `Sprint`         | tag trong `[...]` của PR title, normalize theo `Metadata` cột B — §5 |

Đã đối chiếu với dữ liệu cũ: `LoC (New)` = `additions`, `LoC (Modified)` = `deletions`
(vd `rezil-esms#1648` additions 301 / deletions 2816 → sheet 301 / 2816 / 3117).

Lệnh lấy số liệu:

```bash
gh pr list --repo hybrid-tech-rezil/<repo> --state merged --base develop --limit 200 \
  --json number,title,author,mergedAt,additions,deletions,url
```

---

## 3. Phạm vi PR mỗi lượt

- `--base develop`, `--state merged`. PR `OPEN`/`CLOSED` (không merge) → **bỏ**, không ghi.
- Lọc theo `mergedAt` trong khoảng user yêu cầu (mặc định: từ ngày của Log Date lớn nhất đang có
  trên sheet đến hôm nay). Ngày quy về giờ `Asia/Saigon`.
- Đi **đủ 4 repo** mỗi lượt, kể cả repo không có PR nào trong khoảng — báo rõ 1 dòng
  `portal: không có PR in-scope`.
- **Bỏ** PR hạ tầng release: title không khớp format `[tag] FEATURE-ID | tên` (vd
  `chore: bump version to X.Y.Z`, `chore: update CHANGELOG for X.Y.Z`, PR từ nhánh `release/*`).
  Liệt kê các PR bị bỏ ở cuối lượt để user tự quyết.

---

## 4. Chống ghi trùng (bắt buộc)

Khoá trùng = **URL PR** (cột E). Trước khi ghi:

1. Đọc `KLoC-MVP2!E3:E<dòng cuối>` (một lần, lấy cả cột E).
2. Dựng set URL đã có; chuẩn hoá bằng cách so `<repo>/pull/<số>` (bỏ scheme/host, bỏ `/` cuối).
3. PR đã có trong set → **skip**, không ghi lại, không sửa dòng cũ.

Kiểm tra chéo nhanh 1 PR bằng `find_in_spreadsheet` với query `<repo>/pull/<số>` khi cần chắc chắn.

---

## 5. Parse title, Sprint, PIC

PR title chuẩn của team: `[<tag>] <FEATURE-ID> | <tên việc>`
vd `[PreUAT-MVP2-B] SYNC-GOOGLE | REZIL-3073 - Add the GAS API Executable OAuth settings`.

**Sprint (cột M)** — lấy `<tag>`, normalize về đúng giá trị trong `Metadata` cột B:

| tag trong title                     | ghi vào cột M     |
|-------------------------------------|-------------------|
| `Sprint 17`, `Sprint 18`            | giữ nguyên        |
| `PreUAT-MVP2-B`                     | `PreUAT - MVP2-B` |
| `PreUAT-MVP2-A`                     | `PreUAT - MVP2-A` |
| `UAT-MVP2-A`                        | `UAT-MVP2-A`      |
| `PreUAT`, `UAT`, `Deploy`, `Common` | giữ nguyên        |

Tag lạ, không map được vào `Metadata` cột B → **không tự đặt giá trị mới**: để dòng đó lại, báo user.

**PIC (cột D)** — map `author.login` → tên trong sheet:

| login          | PIC       | login          | PIC       |
|----------------|-----------|----------------|-----------|
| `htv-nghiadv1` | `NghiaDV` | `htv-minhlk`   | `MinhLK`  |
| `htv-sidd`     | `SiDD`    | `htv-hienntt`  | `HienNTT` |
| `htv-anhndt`   | `AnhNDT`  | `htv-quangdd`  | `QuangDD` |
| `htv-sonnv`    | `SonNV`   | `htv-dinhnx`   | `DinhNX`  |
| `htv-manhld`   | `ManhLD`  | `htv-dandn`    | `DanDN`   |
| `htv-vietlq`   | `VietLQ`  | `anhtt-hybrid` | `AnhTT`   |
| `htv-loidh`    | `LoiDH`   | `bieunv`       | `BieuNV`  |

Login không có trong bảng → để trống cột D và báo user (đừng tự suy tên).
Lưu ý `MinhLK` có trong dữ liệu sheet nhưng KHÔNG có trong `Metadata` cột A — bảng trên là chuẩn,
không dùng `Metadata` cột A để validate PIC.

---

## 6. Cột AI Usage (%)

Lấy từ **PR description**: template PR của team có mục

```
## AI Usage
- Tỷ lệ code được AI hỗ trợ: 90%
```

Cách lấy (chạy cùng lúc với `gh pr view` của PR đó):

```bash
gh pr view <số> --repo hybrid-tech-rezil/<repo> --json body -q .body \
  | awk '/^## AI Usage/{f=1;next} f&&/^## /{exit} f' | grep -oE '[0-9]{1,3}' | head -1
```

Bắt buộc **neo theo heading `## AI Usage`** rồi mới lấy số đầu tiên trong khối đó. Grep `%` trên cả
body là SAI: dòng checklist `Đã đọc và nắm rõ 100% yêu cầu của ticket` cũng chứa `100%` (đo
2026-08-27: grep trần trả 100 cho mọi PR).

- Ghi số trần vào cột J (vd `90`), không kèm dấu `%`.
- PR không có mục `## AI Usage`, hoặc mục đó không có số → **để TRỐNG** và báo lại danh sách. Không
  đoán, không copy từ dòng khác, không lấy số từ mục khác của body.
- Người dùng nêu `%AI` khác trong lượt thì theo người dùng (ưu tiên hơn body) và nói rõ PR nào lệch.

**Điền bù cho dòng đã có**: được ghi cột J của dòng cũ **CHỈ KHI** ô đó đang trống và số lấy từ chính
`## AI Usage` của PR ở cột E cùng dòng. Ô đã có số → không đè. Đây là ngoại lệ duy nhất của quy tắc
"chỉ append" ở §9.

## 7. Cách ghi

1. Dò dòng cuối thật: đọc `KLoC-MVP2!A3:A` (hoặc `A1600:A1700` rồi mở rộng) → `lastRow`, `lastStt`.
   STT dòng mới = `lastStt + 1, +2, ...` — xem §1, không tính theo số dòng.
2. Sắp các dòng mới theo `mergedAt` tăng dần (giống dữ liệu cũ: theo ngày, cùng ngày gom theo
   Feature ID).
3. Ghi **một phát** bằng `batch_update_cells` cho `A<lastRow+1>:M<lastRow+n>` — không ghi từng dòng.
4. **Đọc lại** đúng vùng vừa ghi, đối chiếu số dòng + `LoC (Sum)` = `New + Modified`. Lệch → dừng và
   báo, không ghi tiếp.
5. Không chèn dòng giữa bảng (`insert_rows`), chỉ append xuống cuối; không sort lại bảng.

---

## 8. Case đặc biệt

- **PR nhiều Feature ID** (vd `[PreUAT-MVP2-B] REPORT-001, REPORT-002 | ...`): ghi **1 dòng**, cột B =
  ID **đầu tiên** (ghi 2 dòng sẽ nhân đôi LoC ở `SUMIF` của Overview). Báo user danh sách PR loại này
  để tự tách nếu muốn.
- **Feature ID mới chưa có ở `Overview - MVP2`** (vd `SYNC-GOOGLE`, `CLIENT-001`, `TOOL-002`): vẫn ghi
  vào `KLoC-MVP2`, **không tự thêm dòng ở Overview** (Overview còn gom theo sprint và cột E/F/G là
  công thức) — chỉ báo user.
- **PR merge vào base khác `develop`** (nhánh release, nhánh feature dài): mặc định bỏ, báo user.
- **PR revert**: vẫn là 1 PR merged bình thường → ghi như thường (`additions`/`deletions` của chính PR
  revert đó).

---

## 9. Cấm

- Không sửa/xoá dòng đã có trên `KLoC-MVP2` (kể cả dòng sai) — chỉ append. Ngoại lệ duy nhất: điền
  bù cột J đang trống theo §6. Yêu cầu sửa chỗ khác thì phải confirm cụ thể ô nào, giá trị nào.
- Không ghi vào `Overview - MVP2`, `Summary`, `KLoC`, `Metadata`.
- Không tạo/xoá/đổi tên tab, không sửa filter view, không sửa format.
- Không đụng repo code, không git/gh ghi (`gh pr create/merge`, `git push`, `git commit`). `gh` chỉ để
  ĐỌC (`pr list`, `pr view`).

---

## 10. Báo cáo cuối lượt

Trả bảng Markdown gọn:

1. Khoảng ngày + số PR quét được / repo.
2. Bảng dòng vừa ghi: `STT | repo | PR | Feature ID | PIC | New | Modified | Sum | Sprint`.
3. Tổng: số dòng ghi, tổng `New`, tổng `Modified`, tổng `KLoC` (= Sum/1000, 3 chữ số thập phân).
4. Danh sách skip kèm lý do (đã có trên sheet / title sai format / tag lạ / author lạ / nhiều
   Feature ID).
5. Nhắc các dòng còn trống `AI Usage (%)`.
