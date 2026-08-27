# Spec: chụp & gán evidence cho test case trên Google Sheet

Mục tiêu: với mỗi test case chưa có evidence, chụp ảnh màn hình (xem §4 — công cụ hiện tại không
quay được video), upload lên folder Drive của sheet, rồi ghi lại vào cột `Evidence` của sheet.

Mọi mục trong spec này đã được chốt (2026-08-26). Số liệu và selector đều đã verify trên env 207
tại thời điểm đó — chạy lại sau một thời gian thì kiểm lại số đếm ở §1 và §4.

---

## 1. Nguồn dữ liệu

| Mục          | Giá trị                                                                                                                                                                                 |
|--------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Spreadsheet  | `1XQ9nJEEYIzzgOE12vDMAGYx03ne6NRk_tKtEdewERVA`                                                                                                                                          |
| Đọc/ghi bằng | MCP server `gsheets-rezil` (service account `rezil-agent@rezil-agent.iam.gserviceaccount.com`)                                                                                          |
| Quyền cần    | Editor trên spreadsheet (đã share cho service account). Drive **không** đi qua service account — upload bằng `rclone` remote `gdrive-rezil` bằng account Google của người chạy (xem §5) |

### Mapping cột (đã verify trên tab `MOB-011 点検報告 (Inspection Report)`)

Header nằm ở **row 11–12**, dữ liệu TC bắt đầu từ **row 13**.
Lưu ý: header row 12 hiển thị lệch 1 cột so với dữ liệu vì ô header được merge `B:C` —
**giá trị `TC No.` thật nằm ở cột C**, không phải cột B.

| Cột   | Nội dung                                         |
|-------|--------------------------------------------------|
| A     | Cờ đánh dấu (`o`) ở dòng bắt đầu nhóm            |
| C     | `TC No.` (1 → 963)                               |
| D / E | Check Object 1 / 2                               |
| F     | Check content                                    |
| G     | Pre-condition / Test Data                        |
| H     | Steps                                            |
| I     | Expected Result                                  |
| J     | Test IT Result (`OK` / `NG` / `Pending` / `N/A`) |
| K     | Executed Date                                    |
| L     | SQA (người execute)                              |
| M     | **Evidence** ← cột cần ghi                       |
| N     | Note (DefectID, Actual result)                   |

### Số đếm tab MOB-011


> Chi tiết (tổng TC, số ô M trống, định dạng file — đo 2026-08-26) nằm ở `ui-next/app/evidence/EVIDENCE_REFERENCE.md` **§1** — đọc bằng `sed -n '/^## 1\./,/^## /p'` khi thật sự cần.

---

## 2. Định nghĩa "test case còn thiếu evidence"

Một TC thuộc phạm vi xử lý khi **tất cả** điều kiện sau đúng:

1. Dòng có `TC No.` (cột C) là số → là dòng test case, không phải dòng section (`S03_…`).
2. Cột M (`Evidence`) rỗng hoặc chỉ chứa khoảng trắng.
3. Cột J (`Test IT Result`) = `OK`. TC `NG` / `Pending` / `N/A` / rỗng đều **bỏ qua** — chỉ chụp
   evidence cho TC đã execute và pass. (Tab MOB-011 hiện 100% `OK` nên điều kiện này chưa lọc gì.)

TC đã có tên file trong cột M **không** thuộc phạm vi — không đổi tên, không chụp lại,
không convert tên file thành link (xem §5).

### BẮT BUỘC: kiểm Drive trước khi chụp

Cột M trống **không** có nghĩa là chưa có evidence. Nhiều file đã được chụp và upload lên Drive
nhưng chưa ai gán link vào sheet — đó chính là phần việc "cập nhật các link evidence còn thiếu".

Quy tắc: **file đã có trên Drive thì gán link luôn, KHÔNG chụp lại.** Chỉ chụp cho TC không tìm
được file nào.

```bash
FOLDER=10ZYvBxO9Oa2gbTmibKy6DnCrO_wxYAZB
rclone lsf --drive-root-folder-id "$FOLDER" gdrive-rezil: > /tmp/drive.txt
# đối chiếu từng TC trong batch với /tmp/drive.txt trước khi chạy debug.mjs
```

Khi đối chiếu, tên file trên Drive có 3 dạng đều phải nhận ra:

| Dạng                                                    | Ví dụ                                        | Phục vụ TC                                            |
|---------------------------------------------------------|----------------------------------------------|-------------------------------------------------------|
| 1 TC 1 file                                             | `MOB-011_490.png`                            | 490                                                   |
| 1 TC nhiều file                                         | `MOB-011_477_1.png`, `MOB-011_477_2.png`     | 477                                                   |
| **1 file nhiều TC** (dải) — **dạng cũ, không dùng nữa** | `MOB-011_496-497.png`, `MOB-011_499-502.png` | 496–497 · 499–502 → phải tách thành từng file theo §3 |

Ca đã gặp (2026-08-26): dải TC 476–506 có 17 TC đã sẵn file trên Drive (upload 2026-06-18) trong
khi cột M trống. Nếu cứ chụp mới và upload theo tên chuẩn thì **ghi đè evidence của người khác** —
`rclone lsf | grep` trước khi upload là chốt chặn cuối.

---

## 3. Quy tắc đặt tên file

Định dạng chuẩn: `{SCREEN}_{TC}.{ext}` — **TC bao nhiêu thì mã như thế, không zero-pad**.

| Thành phần | Quy tắc                                                                                   |
|------------|-------------------------------------------------------------------------------------------|
| `SCREEN`   | Mã màn ở đầu tên tab, ví dụ tab `MOB-011 点検報告 (Inspection Report)` → `MOB-011`            |
| `TC`       | Giá trị cột C (`TC No.`) **nguyên dạng** → TC 5 = `5`, TC 476 = `476`, TC 963 = `963`     |
| `ext`      | `png` cho ảnh tĩnh, `webm` cho video quay màn hình (`mp4` chỉ dùng nếu tool xuất sẵn mp4) |

Ví dụ: TC 476 → `MOB-011_476.png`.

Nhiều file cho cùng 1 TC: thêm hậu tố `_1`, `_2`, … → `MOB-011_476_1.png`, `MOB-011_476_2.png`.

**MỖI TC MỘT FILE RIÊNG — kể cả khi ảnh giống nhau.** Nhiều TC soi cùng một ảnh thì **nhân bản ảnh
đó thành từng file mang số TC của nó** rồi upload đủ, không đặt tên theo dải và không cho 2 TC trỏ
về cùng một file.


> Chi tiết (ví dụ đúng/sai khi nhiều TC dùng chung 1 ảnh, cách xử lý file tên theo dải còn sót trên Drive) nằm ở `ui-next/app/evidence/EVIDENCE_REFERENCE.md` **§2** — đọc bằng `sed -n '/^## 2\./,/^## /p'` khi thật sự cần.

---

## 4. Chụp evidence

| Mục                       | Giá trị                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
|---------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Loại evidence             | Ảnh `.png` cho mọi TC chụp bằng script. TC nhiều bước → chụp **nhiều ảnh** theo từng bước (`_1`, `_2`, …) thay cho video, vì `debug.mjs` không quay được `.webm`/`.mp4`. TC bắt buộc phải là video thì quay tay, ghi lý do vào cột N                                                                                                                                                                                                                                                                                                                                                                                   |
| Env                       | Chọn theo màn cần chụp: **web mobile** `http://mobile.10.9.17.207.nip.io` cho các tab `MOB-*`; **web admin** `http://admin.10.9.17.207.nip.io` cho các màn quản trị (`INSP-*`, `PLAN-*`, `REPORT-*`, `SITE-*`, `EQUIP-*`, `USER-*`, `GROUP-*`, `TECH-*`, …). Cùng host `10.9.17.207`, cùng env với DB MCP `mysql_207`. Cả hai đã verify trả HTTP 200 ngày 2026-08-26. Tab `CPORTAL-*` (customer portal) chưa xác định URL — kiểm trước khi chụp                                                                                                                                                                        |
| Khác biệt khi chụp admin  | **Chưa verify** — mọi mục trong bảng này đo trên web mobile. Trước batch admin đầu tiên phải chốt lại preset login / URL routing / viewport / selector: xem `ui-next/app/evidence/EVIDENCE_REFERENCE.md` §3                                                                                                                                                                                                                                                                                                                                                                                                            |
| Cách chụp                 | Chụp bằng `ui-next/scripts/debug.mjs` ở chế độ **headless + profile Chrome bền** — web mobile cho tab `MOB-*`, web admin cho màn quản trị; không dùng iPad thật. `snapshot.mjs` **không dùng được** vì không có `--login`/`--profile` (cả hai env đều cần đăng nhập)                                                                                                                                                                                                                                                                                                                                                   |
| Lệnh mẫu (mở phiên)       | **Web mobile.** `node ui-next/scripts/debug.mjs http://mobile.10.9.17.207.nip.io/ --keep mob011 --login rezil --profile mob011 --width 744 --height 1133 --geo "34.6937,135.5023" --chrome-flag "--unsafely-treat-insecure-origin-as-secure=http://mobile.10.9.17.207.nip.io" --step 'click:<sel>' --step 'shot:MOB-011_472'` — URL **luôn** là gốc `/`, xem "Điều hướng" bên dưới. Hai cờ GPS xem dòng "GPS" bên dưới                                                                                                                                                                                                 |
| Lệnh mẫu (lần sau)        | **Web mobile.** `node ui-next/scripts/debug.mjs http://mobile.10.9.17.207.nip.io/ --keep mob011 --width 744 --height 1133 --geo "34.6937,135.5023" --wait 1500 --settle 500 --step "eval:window.__mark('.modal__inner')" --step 'shot:MOB-011_0477'` — attach vào Chrome đã mở, **giữ nguyên trạng thái trang** nên không phải dựng lại flow, không phải login lại. `--width/--height/--geo` là override theo phiên CDP nên vẫn phải truyền mỗi lần; `--login/--profile/--chrome-flag` chỉ có tác dụng ở lần MỞ                                                                                                        |
| Chrome keep-alive         | **Bắt buộc khi chụp một cụm TC.** `--keep mob011` giữ Chrome sống sau khi lệnh xong; lần chạy sau cùng `--keep mob011` attach lại đúng cửa sổ đó (bỏ được ~12–15s mở Chrome + load app + kiểm login mỗi lệnh, đo 2026-08-26: 2,7s → 0,5s trên app local). Trang đang mở cùng origin thì **không** load lại — cần về màn đầu thì thêm `--renav`. Hết batch **phải** `node ui-next/scripts/debug.mjs --keep-stop mob011` (Browser.close → lưu session vào profile), không thì còn 1 Chrome headless treo chiếm profile. Lockfile: `ui-next/.chrome-profiles/.keep-mob011.json`                                           |
| Chờ / settle              | Lần MỞ giữ mặc định (`--wait 4000 --settle 1500`): app Ionic cần thời gian dựng DOM rồi mới login được. Các lệnh attach sau đó dùng `--wait 1500 --settle 500` — trang đã dựng sẵn, chờ thêm chỉ là thời gian chết                                                                                                                                                                                                                                                                                                                                                                                                     |
| Profile                   | 1 profile per account, và tách riêng theo env: `--profile mob011-<role>` cho web mobile, `--profile rezil-admin` cho web admin. Preset `--login rezil` đã khớp form Ionic của app mobile; login 1 lần, các lần sau còn cookie nên tự bỏ qua. Đang có sẵn `dev1`, `mob011`, `mob011-b`, `probe`, `rezil`, `rezil207`, `rezil-admin`, `rezil-local` trong `ui-next/.chrome-profiles/`                                                                                                                                                                                                                                    |
| Khi nào cần headed        | Chỉ khi phải login tay hoặc profile mất session — xem `ui-next/app/evidence/EVIDENCE_REFERENCE.md` §3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Viewport                  | Web mobile: **`--width 744 --height 1133`** (iPad mini gen 6, khung logic 744×1133). Lưu ý `debug.mjs` đặt cứng `deviceScaleFactor: 1`, `mobile: false` và **không** đổi user-agent (`debug.mjs:633`) — ảnh là Chrome desktop ở khung 744×1133, không phải emulate iPad thật. Web admin dùng viewport desktop, chưa chốt số — xem dòng "Khác biệt khi chụp admin"                                                                                                                                                                                                                                                      |
| Điều hướng                | **Web mobile:** app là Ionic, điều hướng bằng nav stack (`root = <component>` trong `src/App.svelte`), **không có URL routing** → không `goto` được URL của màn trong; mọi TC phải đi từ `/` rồi click qua các bước. Web admin chưa xác định có URL routing hay không                                                                                                                                                                                                                                                                                                                                                  |
| Selector                  | **Đọc `ui-next/app/evidence/SELECTORS_MOB011.md` TRƯỚC KHI DÒ** — bản đồ selector đã verify của màn này (kèm `file:line` trong repo mobile) + các cạm bẫy đã gặp. Mỗi màn một file `SELECTORS_<SCREEN>.md`. Thiếu selector nào thì dò 1 lần rồi **ghi bổ sung vào file đó ngay trong lượt**. Class Svelte có hash theo build (`s-5xw9RGpuDz7F`) → không bao giờ dùng hash trong selector                                                                                                                                                                                                                               |
| Không được bấm            | Nút gây mutation mà TC không yêu cầu: `確認しました` / `提出する` (submit report, đổi `plan.state`), `承認`, `削除`, `点検開始を取り消し`, `点検再開`. Chụp dialog thì dừng ở dialog. Chuỗi dialog submit (verify 2026-08-26): `報告書を確認` → `報告書を提出する` → dialog 1 `点検報告を提出の確認` (hoặc `立会者の署名がありませんが、提出しますか？` khi chưa ký) → `提出する` → dialog 2 `報告書を提出します。` → `確認しました` → `PUT /api/v1/inspection/report/submit/<report_id>`. **Dừng ở dialog 2 vẫn chưa mutation.** Luồng resubmit (`report.is_rejected` = 1): dialog 2 đổi thành `報告書を再提出する` có textarea comment bắt buộc → `提出する` → `PUT /api/v1/inspection/report/resubmit/<report_id>`           |
| GPS (bắt buộc khi submit) | App mobile chặn submit/approve nếu không lấy được toạ độ. **Chỉ `--geo` là KHÔNG đủ**: origin `http://…nip.io` là HTTP nên Chrome coi là insecure context và chặn thẳng `navigator.geolocation` — app hiện dialog 「点検アプリで位置情報の設定をオンにします」 rồi dừng, **không** gọi API submit. Phải truyền thêm `--chrome-flag "--unsafely-treat-insecure-origin-as-secure=http://mobile.10.9.17.207.nip.io"`. Kiểm nhanh trước khi chạy flow: `--eval 'window.isSecureContext'` phải trả `true` và `--eval 'new Promise(r=>navigator.geolocation.getCurrentPosition(p=>r("OK"),e=>r("ERR "+e.code)))'` phải trả `OK`. Verify 2026-08-26 |
| Account chính             | Credential ở `~/.claude/projects/-home-nghiadv-IdeaProjects-rezil-esms/credentials/rezil-esms-test.env` (preset `--login rezil` tự đọc, không paste ra command line). Đã verify login env 207 ngày 2026-08-26: `POST /api/v1/auth/login` → 200                                                                                                                                                                                                                                                                                                                                                                         |
| Account đó là ai          | `user.id` = 4, engineer `eid` = 4 (`G-00004`), group `gid` = 4 — chi tiết ở `ui-next/app/evidence/EVIDENCE_REFERENCE.md` §3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Chỉ dùng 1 account        | Toàn bộ TC chụp bằng account `eid` = 4 ở trên, không cấp thêm account thứ 2. TC cần engineer **không** được assign (ví dụ TC 17) thì chọn inspection mà `eid` = 4 không có trong `plan_assignment`; không dựng được thì để trống cột M + ghi lý do vào cột N                                                                                                                                                                                                                                                                                                                                                           |
| Quyền group               | Không kiểm trước quyền của group `YenLTB` (gid 4); TC bị chặn quyền xử lý như TC không dựng được điều kiện                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### Tái sử dụng evidence cho nhóm TC cùng trạng thái (tăng tốc)

Nhiều TC liên tiếp kiểm tra **cùng một trạng thái màn hình**, chỉ khác phần tử được soi. Với nhóm đó:
dựng trạng thái **một lần**, rồi từ cùng trạng thái đó chụp mỗi TC một ảnh **chỉ khác vùng khoanh đỏ**.
Không dựng lại flow từ đầu cho từng TC — phần dựng flow là phần tốn thời gian nhất.


> Chi tiết (ví dụ nhóm TC 476–478, snippet `window.__mark` đầy đủ để inject, 2 ca selector sai đã gặp) nằm ở `ui-next/app/evidence/EVIDENCE_REFERENCE.md` **§4** — đọc bằng `sed -n '/^## 4\./,/^## /p'` khi thật sự cần.

### Tự kiểm ảnh sau khi chụp — KHÔNG mở file ảnh

Ảnh chụp xong phải kiểm hai lớp trước khi upload:

1. `__mark` trả `marked` (các giá trị khác: `NOTFOUND` / `ZERO-SIZE` / `FULL-VIEWPORT` → sửa
   selector rồi chụp lại, không upload ảnh thiếu khoanh đỏ).
2. Kiểm chính file ảnh bằng script — chạy **1 lần cho cả thư mục staging**:

```bash
node ui-next/scripts/shot-check.mjs "$STAGE"
# MOB-011_476.png 744x1133 red=3120 box=(60,214)-(680,544) OK
# MOB-011_477.png 744x1133 red=0 box=- NO-RED        ← chụp lại
```

Verdict: `OK` · `NO-RED` (không có viền đỏ trong ảnh) · `BLANK` (ảnh trơn, trang chưa dựng xong) ·
`UNREADABLE`. Cờ kèm theo: `WEAK` (quá ít pixel đỏ để là khung khoanh — thường là icon đỏ sẵn có) ·
`EDGE` (viền chạm mép, có thể bị cắt) · `FULL-VIEWPORT` (khoanh nhầm wrapper). Chỉ `OK` không cờ mới
được upload. Exit code 1 nếu có ảnh chưa đạt.

**TUYỆT ĐỐI KHÔNG dùng `Read` để mở file `.png`.** Một ảnh 744×1133 tốn ~2,5k token và nằm lại
trong context đến hết phiên; phiên 2026-08-26 đã mất ~1,5M token chỉ vì mở 12 ảnh. `shot-check.mjs`
trả đúng những dữ kiện cần dưới dạng một dòng text. Cần nhìn tận mắt thì báo người dùng đường dẫn
file để họ mở, không tự mở.

### Dữ liệu pre-condition sẵn có

Mỗi TC phải đọc cột G (`Pre-condition`) và dùng đúng bản ghi thoả điều kiện trước khi chụp.
Không dựng được điều kiện thì **để trống cột M và ghi lý do vào cột N** — không chụp màn hình
sai điều kiện.


> Chi tiết (ca TC 476 thiếu điều kiện chữ ký, bảng đếm `plan.state`/`is_rejected` trên env 207, câu SQL đếm lại) nằm ở `ui-next/app/evidence/EVIDENCE_REFERENCE.md` **§5** — đọc bằng `sed -n '/^## 5\./,/^## /p'` khi thật sự cần.

## 5. Upload lên Drive và ghi vào sheet

### Folder đích

Phạm vi hiện tại: **chỉ tab MOB-011**. Cần làm sheet khác thì bổ sung 1 dòng vào bảng dưới trước khi chạy.

Upload bằng **`rclone`, remote `gdrive-rezil`** (đã verify đọc được folder MOB-011 ngày 2026-08-26:
liệt kê 526 file). KHÔNG dùng Drive API qua service account `rezil-agent` — Drive API chưa được bật
trong project của service account đó (`403 Google Drive API has not been used in project
192480675792 before or it is disabled`), chỉ Sheets API dùng được.

Mỗi lệnh `rclone` mất ~2,5s (đo 2026-08-26). Làm từng file (`copyto` → `lsf` → `link` = 3 lệnh/file)
thì một batch 20 TC trả ~10 phút chỉ cho `rclone`. Vì vậy **upload theo batch: 3 lệnh cho cả batch**,
qua một thư mục staging đặt sẵn ĐÚNG tên đích.

```bash
FOLDER=10ZYvBxO9Oa2gbTmibKy6DnCrO_wxYAZB          # folder MOB-011
STAGE=$(mktemp -d)                                 # staging RIÊNG cho batch này

# 1. Gom ảnh của batch vào staging, đặt luôn tên đích (debug.mjs đặt tên khác: <label>-<tag>-<runId>.png)
cp ui-next/.snapshots/mob011-MOB-011_476-<runId>.png "$STAGE/MOB-011_476.png"

# 2. Liệt kê folder Drive MỘT lần — dùng cho cả bước chống ghi đè và bước lấy link (field ID)
rclone lsjson --drive-root-folder-id "$FOLDER" gdrive-rezil: > /tmp/drive-mob011.json
comm -12 <(ls "$STAGE" | sort) <(jq -r '.[].Name' /tmp/drive-mob011.json | sort)   # in ra tên nào TRÙNG

# 3. Upload cả batch bằng 1 lệnh (chỉ chạy khi bước 2 không in gì)
rclone copy "$STAGE" --drive-root-folder-id "$FOLDER" gdrive-rezil: \
  --transfers 8 --checkers 8 --no-traverse

# 4. Lấy link cho cả batch bằng 1 lệnh: dựng URL từ field ID (KHÔNG dùng `rclone link` — xem dưới)
rclone lsjson --drive-root-folder-id "$FOLDER" gdrive-rezil: \
  | jq -r '.[] | select(.Name | startswith("MOB-011_")) | "\(.Name)\thttps://drive.google.com/file/d/\(.ID)/view"'
```

> **TUYỆT ĐỐI KHÔNG `rclone link`.** Lệnh đó cấp quyền `anyoneWithLink / reader` lên chính file trên
> Drive — ai có URL cũng mở được, kể cả ngoài tổ chức. Người có quyền vào folder mở
> `https://drive.google.com/file/d/<ID>/view` là đủ, không cần cấp quyền gì. Cùng quy tắc với
> `RELEASE_FLOW.md` §deploy evidence và `.claude/agents/github-ops.md` §Evidence Folder.

> Chi tiết (114 file đã lỡ bật anyone-with-link ngày 2026-08-26 + lệnh kiểm lại) nằm ở `ui-next/app/evidence/EVIDENCE_REFERENCE.md` **§6** — đọc bằng `sed -n '/^## 6\./,/^## /p'` khi thật sự cần.

Quy ước dùng `rclone`:
- Luôn truyền `--drive-root-folder-id <folder id của sheet>`; không upload vào My Drive gốc.
- `rclone copy` chỉ được dùng với **thư mục staging** mà mọi file đã mang đúng tên đích. Upload lẻ 1 file
  thì vẫn dùng `copyto` với tên đích tường minh — **không** `copy` từ `.snapshots/` (tên local lọt vào Drive).
- Chống ghi đè: đối chiếu staging với `lsjson` **trước** khi upload (bước 2). Trùng tên thì **dừng**,
  không ghi đè evidence cũ.
- Link ghi vào cột M dựng từ field `ID` của `lsjson`: `https://drive.google.com/file/d/<ID>/view`.
  Không gọi `rclone link` (vừa tốn 1 lệnh/file, vừa cấp quyền anyone-with-link — xem cảnh báo trên).
- Sau khi upload: `lsjson` lại (bước 4) là đã xác nhận file có trên Drive, rồi mới ghi cột M.

| Sheet   | Folder                                                                   |
|---------|--------------------------------------------------------------------------|
| MOB-011 | https://drive.google.com/drive/folders/10ZYvBxO9Oa2gbTmibKy6DnCrO_wxYAZB |

Không cần đặt quyền share riêng cho file upload: `rclone` copy vào chính folder MOB-011 nên file
thừa hưởng quyền của folder đó.

### Giá trị ghi vào cột M

Ghi công thức `HYPERLINK`, text hiển thị là tên file — nhất quán với 473 ô cũ (đang là tên file
trần) mà vẫn click ra được Drive:

```
=HYPERLINK("<drive_url>";"MOB-011_476.png")
```

- `<drive_url>` = `https://drive.google.com/file/d/<ID>/view`, `ID` lấy từ `lsjson` (xem trên).
- Text hiển thị = **đúng tên file** đã upload, không phải mô tả khác.
- Separator trong công thức là **`,`** (spreadsheet locale `en_US`), không phải `;`.
- Ghi bằng `valueInputOption = USER_ENTERED` để Sheets nhận là công thức, không phải chuỗi.
- **Nhiều file cho 1 TC**: một ô chỉ chứa được **1** `HYPERLINK`. Trường hợp này ghi ô dạng
  **rich text** — `stringValue` là các tên file cách nhau bằng `\n`, kèm `textFormatRuns` gắn link
  cho từng đoạn (Sheets API `updateCells`, `fields: "userEnteredValue,textFormatRuns"`). Kết quả
  hiển thị vẫn là tên file, click từng dòng ra đúng file. Giữ 1 ô cho 1 TC, không tách sang cột khác.

Không sửa cột J/K/L khi chỉ bổ sung evidence — result và người execute đã có sẵn. Chỉ chụp evidence
cho TC có J = `OK`; nếu chụp ra kết quả khác Expected thì **không** tự đổi J thành `NG`, mà để trống
cột M, ghi lý do vào cột N và báo lại người phụ trách.

---

## 6. Quy trình chạy

1. Đọc tab → lọc danh sách TC thiếu evidence theo §2. In ra số lượng + dải TC No. để xác nhận.
   Đọc luôn `SELECTORS_<SCREEN>.md` của màn (MOB-011: `ui-next/app/evidence/SELECTORS_MOB011.md`).
2. Kích thước 1 lần chạy: **20 TC/lần**, báo cáo rồi mới chạy tiếp (490 TC trong 1 lượt là quá
   nhiều để review). Số này điều chỉnh được theo yêu cầu từng lượt.
3. **Đối chiếu Drive** (`rclone lsf`): TC nào đã có file thì chỉ lấy link + ghi cột M, loại khỏi
   danh sách cần chụp. Xem §2 — bắt buộc, làm trước khi mở `debug.mjs`.
4. **Gom nhóm trước khi chụp**: sắp các TC trong batch theo trạng thái màn hình cần dựng, TC nào
   dùng chung trạng thái thì chụp liên tiếp trên **cùng một Chrome `--keep`** (xem §4 — Tái sử dụng
   evidence). Đây là bước quyết định tốc độ của cả batch.
5. Mở Chrome keep-alive **1 lần** cho cả batch (lệnh mẫu "mở phiên" ở §4), rồi với từng TC còn thiếu
   file: dựng pre-condition → chụp (khoanh đỏ phần tử của TC đó) → gom ảnh vào staging với đúng tên
   theo §3. Hết batch thì `--keep-stop`.
6. Upload cả batch theo §5 (3 lệnh `rclone` cho cả batch, **không** 3 lệnh cho mỗi file), lấy link từ
   field `ID` của `lsjson`.
7. Ghi cột M bằng `batch_update_cells` (1 lần cho cả batch), **không** ghi từng ô lẻ.
8. Sau mỗi batch: đọc lại đúng các ô vừa ghi, đối chiếu tên file ↔ TC No. rồi báo kết quả
   (số TC đã ghi, số TC skip + lý do).
9. Dòng cuối của mỗi lượt (ngay trước khối `<<<SUGGEST>>>`) là một dòng trạng thái duy nhất:
   `<<<STATE>>> tab=<tên tab> · đã ghi: <dải TC> · còn thiếu: <dải TC> · treo: <TC + lý do ngắn>`.
   Console dùng chính dòng này làm bối cảnh khi phải mở phiên mới, nên nó phải tự đủ nghĩa.

### Giữ tốc độ (đo trên 2 phiên `/evidence` ngày 2026-08-26)

Batch 20 TC đang mất ~40 phút. Phân bổ đo được: `debug.mjs` 45 lần chạy × 29,5s = 22 min ·
`rclone` 5,8–7,7 min · model nghĩ giữa các tool 12–21 min · Sheets/DB < 1 min. Ba quy tắc chống
lặp lại tình trạng đó:

- **Không mở Chrome mới cho mỗi lệnh.** 1 batch = 1 Chrome `--keep`, đóng bằng `--keep-stop` khi xong.
- **Không gọi `rclone` theo từng file.** 3 lệnh cho cả batch (§5).
- **Không chạy `debug.mjs` để dò selector.** 22/45 lần chạy của phiên 597eef78 ra 0 ảnh vì đi dò
  selector. Lấy selector từ `SELECTORS_<SCREEN>.md` trước; thiếu thì dò bằng `--step eval:` **trong
  cùng lệnh đang mở** (`document.querySelectorAll(...).length`, liệt kê text của node), khoanh đỏ
  luôn, rồi **ghi selector mới vào file đó ngay trong lượt** để lượt sau khỏi dò lại.

### Giữ context rẻ (đo 2026-08-27)

Chi phí token của một batch ≈ **số lượt gọi tool × context hiện có**, mà context chỉ tăng chứ không
giảm trong một phiên. Phiên `/evidence` ngày 2026-08-26 đi từ 49k lên 152k token/lượt và tiêu ~11,5M
token cho khoảng 40 TC. Bốn quy tắc:

- **Không mở file ảnh** — xem §4 "Tự kiểm ảnh".
- **Đọc file theo đoạn, không `cat` cả file.** `SELECTORS_<SCREEN>.md` và `EVIDENCE_REFERENCE.md`
  đều dài; lấy đúng mục cần bằng `sed -n '/^## <mục>/,/^## /p'` hoặc `grep -n -A12 '<từ khoá>'`.
- **Gộp lệnh.** Nhiều `--step` trong một lần `debug.mjs`, một `rclone` cho cả batch, một
  `batch_update_cells` cho cả batch. Mỗi lời gọi tool là một lần trả tiền cho toàn bộ context.
- **Kết thúc mỗi lượt bằng một dòng trạng thái** `<<<STATE>>>` (xem §6 bước 9): khi context đầy,
  console tự mở phiên mới và chèn lại đúng dòng đó, nên không cần giữ cả hội thoại để nhớ việc.

## 7. Ràng buộc

- Chỉ ghi vào cột M (và cột N khi cần ghi lý do skip). Không chèn/xoá dòng, không sửa
  Steps / Expected Result / Pre-condition, không đổi format ô.
- **Không xoá** file evidence đã có trên Drive. Không chạy `rclone delete`/`rclone move`/`rclone sync`
  lên folder evidence, và **không `rclone link`** (lệnh đó cấp quyền anyone-with-link cho file — xem
  §5). Lệnh được dùng: `copyto` (1 file, tên đích tường minh), `copy` (từ thư mục staging), `lsf`,
  `lsjson`, và `moveto` **chỉ để rename** theo điều kiện dưới đây.
- **Rename: chỉ khi người dùng yêu cầu trực tiếp, hoặc đã hỏi và được xác nhận.** Không bao giờ tự
  rename trong lúc chạy batch, kể cả khi tên file cũ sai quy ước §3 — tên cũ đang được tham chiếu ở
  các ô cột M đã ghi. Khi được phép, làm đúng thứ tự: in bảng `tên cũ → tên mới` cho toàn bộ file
  định đổi và chờ xác nhận → `rclone lsf` kiểm tên mới CHƯA tồn tại (trùng thì dừng, không ghi đè) →
  `rclone moveto --drive-root-folder-id "$FOLDER" gdrive-rezil:<cũ> gdrive-rezil:<mới>` (giữ nguyên
  folder, `moveto` sang folder khác = di chuyển, không được làm) → `rclone lsf` xác nhận → cập nhật
  ô cột M của MỌI TC đang trỏ tới tên cũ, rồi báo lại danh sách đã đổi.
- Không chỉnh các ô thống kê (`Total TCs`, `OK`, `NG`, `% Test Progress` ở row 5–10) — đó là công thức.
- Chỉ 2 file trong repo được tạo/sửa, cả hai nằm ở `ui-next/app/evidence/`: `SELECTORS_<SCREEN>.md`
  (bản đồ selector của màn đang chụp — xem §4) và **chính spec này**. Mọi file khác chỉ được ĐỌC;
  thấy sai thì báo người dùng chứ không tự sửa. Không dùng Bash (`>`, `tee`, `sed -i`) để lách.
- Khi sửa spec này: **dữ liệu** đã tự verify trong lượt (số đếm ở §1/§4, selector, cạm bẫy mới, mốc
  ngày verify) thì cập nhật thẳng và báo rõ đã đổi mục nào. **Rule / ràng buộc** (nới quyền, bỏ guard,
  đổi quy ước đặt tên §3, đổi kích thước batch §6) thì phải hỏi và được đồng ý trước — spec được nhúng
  nguyên văn vào prompt của agent, nên tự nới rule là tự bỏ chốt chặn của chính mình.
- Xác nhận đúng tab trước khi ghi: `gid` trong URL không phải tên tab, phải resolve `sheetId` → `title`
  qua Sheets API (`sheets.properties(sheetId,title)`) rồi mới ghi.

---

## Phụ lục

Link spreadsheet / tab / folder Drive: `ui-next/app/evidence/EVIDENCE_REFERENCE.md` §7.
