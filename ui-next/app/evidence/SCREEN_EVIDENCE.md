# Spec: chụp & gán evidence cho test case trên Google Sheet

Mục tiêu: với mỗi test case chưa có evidence, chụp ảnh màn hình (xem §4 — công cụ hiện tại không
quay được video), upload lên folder Drive của sheet, rồi ghi lại vào cột `Evidence` của sheet.

Mọi mục trong spec này đã được chốt (2026-08-26). Số liệu và selector đều đã verify trên env 207
tại thời điểm đó — chạy lại sau một thời gian thì kiểm lại số đếm ở §1 và §4.

---

## 1. Nguồn dữ liệu

| Mục          | Giá trị                                                                                        |
|--------------|------------------------------------------------------------------------------------------------|
| Spreadsheet  | `1XQ9nJEEYIzzgOE12vDMAGYx03ne6NRk_tKtEdewERVA`                                                 |
| Đọc/ghi bằng | MCP server `gsheets-rezil` (service account `rezil-agent@rezil-agent.iam.gserviceaccount.com`) |
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

### Trạng thái hiện tại của tab MOB-011 (đo ngày 2026-08-26)

| Chỉ số                   | Giá trị                                                           |
|--------------------------|-------------------------------------------------------------------|
| Tổng TC                  | 963                                                               |
| Cột M đã có evidence     | 473                                                               |
| Cột M trống              | **490** — gồm TC `269`, `279` và liên tục TC `476` → `963`        |
| Result cột J             | 963/963 = `OK` (không có NG/Pending/N/A)                          |
| Định dạng file đang dùng | `.webm` 250, `.png` 189, `.mp4` 30                                |
| Dạng tên file            | 4 chữ số: 321 file · 3 chữ số: 148 file · biến thể nhiều file: 20 |
| Ô M chứa URL Drive       | **0** — toàn bộ đang là **tên file trần**, chưa phải link         |

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

| Dạng | Ví dụ | Phục vụ TC |
|---|---|---|
| 1 TC 1 file | `MOB-011_490.png` | 490 |
| 1 TC nhiều file | `MOB-011_477_1.png`, `MOB-011_477_2.png` | 477 |
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
| `TC`       | Giá trị cột C (`TC No.`) **nguyên dạng** → TC 5 = `5`, TC 476 = `476`, TC 963 = `963`      |
| `ext`      | `png` cho ảnh tĩnh, `webm` cho video quay màn hình (`mp4` chỉ dùng nếu tool xuất sẵn mp4) |

Ví dụ: TC 476 → `MOB-011_476.png`.

Nhiều file cho cùng 1 TC: thêm hậu tố `_1`, `_2`, … → `MOB-011_476_1.png`, `MOB-011_476_2.png`.

**MỖI TC MỘT FILE RIÊNG — kể cả khi ảnh giống nhau.** Nhiều TC soi cùng một ảnh thì **nhân bản ảnh
đó thành từng file mang số TC của nó** rồi upload đủ, không đặt tên theo dải và không cho 2 TC trỏ
về cùng một file.

| | Đúng | Sai |
|---|---|---|
| TC 496 + 497 dùng chung 1 ảnh | `MOB-011_496.png` **và** `MOB-011_497.png` (2 file, nội dung như nhau) | `MOB-011_496-497.png` dùng cho cả 2 |
| TC 499 → 502 dùng chung 1 ảnh | `MOB-011_499.png`, `MOB-011_500.png`, `MOB-011_501.png`, `MOB-011_502.png` | `MOB-011_499-502.png` |

Lý do: mỗi ô cột M tự mô tả được TC của nó; thay/chụp lại evidence 1 TC không ảnh hưởng TC khác.

Trên Drive **vẫn còn** file cũ đặt tên theo dải (`MOB-011_496-497.png`, `MOB-011_499-502.png`) do
lượt làm trước. Không xoá file cũ; khi gặp thì nhân bản ra các file theo số TC rồi trỏ cột M sang
file mới:

```bash
FOLDER=10ZYvBxO9Oa2gbTmibKy6DnCrO_wxYAZB
# nhân bản ngay trên Drive (server-side, không tải về máy)
rclone copyto --drive-root-folder-id "$FOLDER" \
  gdrive-rezil:MOB-011_496-497.png gdrive-rezil:MOB-011_496.png
```

Evidence cũ trên Drive lẫn nhiều kiểu (`MOB-011_0001.webm` 4 chữ số, `MOB-011_010.mp4` 3 chữ số,
`MOB-011_0323-1.webm` dấu `-`). File cũ **giữ nguyên**, không rename (rename làm hỏng tham chiếu
đã có); file mới theo quy tắc trên.

---

## 4. Chụp evidence

| Mục                       | Giá trị                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
|---------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Loại evidence             | Ảnh `.png` cho mọi TC chụp bằng script. TC nhiều bước → chụp **nhiều ảnh** theo từng bước (`_1`, `_2`, …) thay cho video, vì `debug.mjs` không quay được `.webm`/`.mp4`. TC bắt buộc phải là video thì quay tay, ghi lý do vào cột N                                                                                                                                                                                                                                                                                                                                                                                                    |
| Env                       | Chọn theo màn cần chụp: **web mobile** `http://mobile.10.9.17.207.nip.io` cho các tab `MOB-*`; **web admin** `http://admin.10.9.17.207.nip.io` cho các màn quản trị (`INSP-*`, `PLAN-*`, `REPORT-*`, `SITE-*`, `EQUIP-*`, `USER-*`, `GROUP-*`, `TECH-*`, …). Cùng host `10.9.17.207`, cùng env với DB MCP `mysql_207`. Cả hai đã verify trả HTTP 200 ngày 2026-08-26. Tab `CPORTAL-*` (customer portal) chưa xác định URL — kiểm trước khi chụp                                                                                                                                                                                         |
| Khác biệt khi chụp admin  | **Chưa verify tính tới 2026-08-26** — mọi mục dưới đây trong bảng này (`Lệnh mẫu`, `Viewport`, `Điều hướng`, `Selector`, `Không được bấm`) đều đo trên web mobile. Trước batch admin đầu tiên phải chạy 1 lần để chốt: preset `--login rezil` có khớp form login admin không · admin có URL routing hay không (nếu có thì `goto:<url>` được, khác app mobile Ionic ở dòng `Điều hướng`) · viewport desktop dùng thay cho `744×1133` · selector BEM của màn admin. Cờ GPS ở dòng `GPS` chỉ cần cho luồng submit của app mobile; nếu màn admin cũng chặn theo vị trí thì phải đổi origin trong cờ thành `http://admin.10.9.17.207.nip.io` |
| Cách chụp                 | Chụp bằng `ui-next/scripts/debug.mjs` ở chế độ **headless + profile Chrome bền** — web mobile cho tab `MOB-*`, web admin cho màn quản trị; không dùng iPad thật. `snapshot.mjs` **không dùng được** vì không có `--login`/`--profile` (cả hai env đều cần đăng nhập)                                                                                                                                                                                                                                                                                                                                                                    |
| Lệnh mẫu (mở phiên)       | **Web mobile.** `node ui-next/scripts/debug.mjs http://mobile.10.9.17.207.nip.io/ --keep mob011 --login rezil --profile mob011 --width 744 --height 1133 --geo "34.6937,135.5023" --chrome-flag "--unsafely-treat-insecure-origin-as-secure=http://mobile.10.9.17.207.nip.io" --step 'click:<sel>' --step 'shot:MOB-011_472'` — URL **luôn** là gốc `/`, xem "Điều hướng" bên dưới. Hai cờ GPS xem dòng "GPS" bên dưới                                                                                                                                                                                                                  |
| Lệnh mẫu (lần sau)        | **Web mobile.** `node ui-next/scripts/debug.mjs http://mobile.10.9.17.207.nip.io/ --keep mob011 --width 744 --height 1133 --geo "34.6937,135.5023" --wait 1500 --settle 500 --step "eval:window.__mark('.modal__inner')" --step 'shot:MOB-011_0477'` — attach vào Chrome đã mở, **giữ nguyên trạng thái trang** nên không phải dựng lại flow, không phải login lại. `--width/--height/--geo` là override theo phiên CDP nên vẫn phải truyền mỗi lần; `--login/--profile/--chrome-flag` chỉ có tác dụng ở lần MỞ                                                                                                                         |
| Chrome keep-alive         | **Bắt buộc khi chụp một cụm TC.** `--keep mob011` giữ Chrome sống sau khi lệnh xong; lần chạy sau cùng `--keep mob011` attach lại đúng cửa sổ đó (bỏ được ~12–15s mở Chrome + load app + kiểm login mỗi lệnh, đo 2026-08-26: 2,7s → 0,5s trên app local). Trang đang mở cùng origin thì **không** load lại — cần về màn đầu thì thêm `--renav`. Hết batch **phải** `node ui-next/scripts/debug.mjs --keep-stop mob011` (Browser.close → lưu session vào profile), không thì còn 1 Chrome headless treo chiếm profile. Lockfile: `ui-next/.chrome-profiles/.keep-mob011.json`                                                            |
| Chờ / settle              | Lần MỞ giữ mặc định (`--wait 4000 --settle 1500`): app Ionic cần thời gian dựng DOM rồi mới login được. Các lệnh attach sau đó dùng `--wait 1500 --settle 500` — trang đã dựng sẵn, chờ thêm chỉ là thời gian chết                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Profile                   | 1 profile per account, và tách riêng theo env: `--profile mob011-<role>` cho web mobile, `--profile rezil-admin` cho web admin. Preset `--login rezil` đã khớp form Ionic của app mobile; login 1 lần, các lần sau còn cookie nên tự bỏ qua. Đang có sẵn `dev1`, `mob011`, `mob011-b`, `probe`, `rezil`, `rezil207`, `rezil-admin`, `rezil-local` trong `ui-next/.chrome-profiles/`                                                                                                                                                                                                                                                     |
| Khi nào cần headed        | Chỉ khi phải login tay (SSO/Entra ID, MFA) hoặc profile mất session: chạy 1 lần `--profile <ten> --profile-login`, đăng nhập rồi đóng cửa sổ, sau đó quay lại headless                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Viewport                  | Web mobile: **`--width 744 --height 1133`** (iPad mini gen 6, khung logic 744×1133). Lưu ý `debug.mjs` đặt cứng `deviceScaleFactor: 1`, `mobile: false` và **không** đổi user-agent (`debug.mjs:633`) — ảnh là Chrome desktop ở khung 744×1133, không phải emulate iPad thật. Web admin dùng viewport desktop, chưa chốt số — xem dòng "Khác biệt khi chụp admin"                                                                                                                                                                                                                                                                       |
| Điều hướng                | **Web mobile:** app là Ionic, điều hướng bằng nav stack (`root = <component>` trong `src/App.svelte`), **không có URL routing** → không `goto` được URL của màn trong; mọi TC phải đi từ `/` rồi click qua các bước. Web admin chưa xác định có URL routing hay không                                                                                                                                                                                                                                                                                                                                                                   |
| Selector                  | **Đọc `ui-next/app/evidence/SELECTORS_MOB011.md` TRƯỚC KHI DÒ** — bản đồ selector đã verify của màn này (kèm `file:line` trong repo mobile) + các cạm bẫy đã gặp. Mỗi màn một file `SELECTORS_<SCREEN>.md`. Thiếu selector nào thì dò 1 lần rồi **ghi bổ sung vào file đó ngay trong lượt**. Class Svelte có hash theo build (`s-5xw9RGpuDz7F`) → không bao giờ dùng hash trong selector                                                                                                                                                                                                                                                |
| Không được bấm            | Nút gây mutation mà TC không yêu cầu: `確認しました` / `提出する` (submit report, đổi `plan.state`), `承認`, `削除`, `点検開始を取り消し`, `点検再開`. Chụp dialog thì dừng ở dialog. Chuỗi dialog submit (verify 2026-08-26): `報告書を確認` → `報告書を提出する` → dialog 1 `点検報告を提出の確認` (hoặc `立会者の署名がありませんが、提出しますか？` khi chưa ký) → `提出する` → dialog 2 `報告書を提出します。` → `確認しました` → `PUT /api/v1/inspection/report/submit/<report_id>`. **Dừng ở dialog 2 vẫn chưa mutation.** Luồng resubmit (`report.is_rejected` = 1): dialog 2 đổi thành `報告書を再提出する` có textarea comment bắt buộc → `提出する` → `PUT /api/v1/inspection/report/resubmit/<report_id>`                            |
| GPS (bắt buộc khi submit) | App mobile chặn submit/approve nếu không lấy được toạ độ. **Chỉ `--geo` là KHÔNG đủ**: origin `http://…nip.io` là HTTP nên Chrome coi là insecure context và chặn thẳng `navigator.geolocation` — app hiện dialog 「点検アプリで位置情報の設定をオンにします」 rồi dừng, **không** gọi API submit. Phải truyền thêm `--chrome-flag "--unsafely-treat-insecure-origin-as-secure=http://mobile.10.9.17.207.nip.io"`. Kiểm nhanh trước khi chạy flow: `--eval 'window.isSecureContext'` phải trả `true` và `--eval 'new Promise(r=>navigator.geolocation.getCurrentPosition(p=>r("OK"),e=>r("ERR "+e.code)))'` phải trả `OK`. Verify 2026-08-26                  |
| Account chính             | Credential ở `~/.claude/projects/-home-nghiadv-IdeaProjects-rezil-esms/credentials/rezil-esms-test.env` (preset `--login rezil` tự đọc, không paste ra command line). Đã verify login env 207 ngày 2026-08-26: `POST /api/v1/auth/login` → 200                                                                                                                                                                                                                                                                                                                                                                                          |
| Account đó là ai          | `user.id` = 4 (`user.name` = `Admin`, `state` = 1), engineer `eid` = 4 / code `G-00004` / `engineerName` = `nghiadv test ep`, group `gid` = 4 (`YenLTB`). App mobile chỉ cho login khi user có bản ghi `engineer` và `/api/v1/auth/me` trả `engineerId` → account này **là engineer hợp lệ**; `user.name` = `Admin` chỉ là tên hiển thị, không phải role                                                                                                                                                                                                                                                                                |
| Chỉ dùng 1 account        | Toàn bộ TC chụp bằng account `eid` = 4 ở trên, không cấp thêm account thứ 2. TC cần engineer **không** được assign (ví dụ TC 17) thì chọn inspection mà `eid` = 4 không có trong `plan_assignment`; không dựng được thì để trống cột M + ghi lý do vào cột N                                                                                                                                                                                                                                                                                                                                                                            |
| Quyền group               | Không kiểm trước quyền của group `YenLTB` (gid 4). TC nào bị chặn quyền sẽ lộ ra lúc chụp → xử lý như TC không dựng được điều kiện                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

### Tái sử dụng evidence cho nhóm TC cùng trạng thái (tăng tốc)

Nhiều TC liên tiếp kiểm tra **cùng một trạng thái màn hình**, chỉ khác phần tử được soi. Với nhóm đó:
dựng trạng thái **một lần**, rồi từ cùng trạng thái đó chụp mỗi TC một ảnh **chỉ khác vùng khoanh đỏ**.
Không dựng lại flow từ đầu cho từng TC — phần dựng flow là phần tốn thời gian nhất.

Ví dụ TC 476 / 477 / 478 đều nằm trong popup `報告書を提出します。`:

| TC | Kiểm tra | Vùng khoanh đỏ |
|---|---|---|
| 476 | Nội dung dialog (title / body / 2 nút) | Cả popup |
| 477 | Nút `未確認` (cancel) | Riêng nút `未確認` |
| 478 | (TC kế tiếp trong cùng popup) | Phần tử tương ứng |

Cách làm:
1. Chạy flow tới trạng thái đích 1 lần (ở ví dụ trên: mở MOB-011 → mode Confirm → `報告書を提出する`).
2. Với mỗi TC trong nhóm: `--step eval:` khoanh đỏ phần tử của TC đó → `--step shot:MOB-011_<NNNN>`
   → `--step eval:` xoá khoanh đỏ. Cả nhóm nằm trong **một** lần chạy `debug.mjs`.
3. TC nào cần thao tác làm mất trạng thái (ví dụ TC 477 bấm `未確認` thì popup đóng) thì để **cuối
   nhóm**, hoặc chụp trạng thái trước-sau rồi mới bấm.

Với `--keep` (xem bảng trên) cả nhóm **không cần** nằm trong một lệnh: trang không bị load lại giữa
các lệnh nên trạng thái vừa dựng vẫn còn, chia thành nhiều lệnh ngắn để soi kết quả từng ảnh cũng
không mất thêm thời gian. `window.__mark` cũng còn nguyên trong trang → inject snippet **1 lần** ở
lệnh đầu, các lệnh sau gọi thẳng `--step "eval:window.__mark('<sel>')"`.

`debug.mjs` **không có** cờ `--mark` (chỉ `snapshot.mjs` có, mà `snapshot.mjs` lại không login được).
Nên khoanh đỏ bằng overlay tự inject qua `--step eval:`:

```js
// khoanh đỏ + note; gọi nhiều lần cho nhiều phần tử, script tự đánh số
(()=>{window.__mark=(sel,note)=>{const e=document.querySelector(sel);if(!e)return 'NOTFOUND:'+sel;
const r=e.getBoundingClientRect();if(!r.width||!r.height)return 'ZERO-SIZE:'+sel;
if(r.width>=innerWidth*0.98&&r.height>=innerHeight*0.98)return 'FULL-VIEWPORT:'+sel;
const n=(window.__markN=(window.__markN||0)+1);
const d=document.createElement('div');d.className='__mark';
d.style.cssText=`position:fixed;left:${r.x-4}px;top:${r.y-4}px;width:${r.width+8}px;height:${r.height+8}px;
border:3px solid #e00;border-radius:4px;z-index:2147483647;pointer-events:none`;
if(note){const l=document.createElement('div');l.textContent=n+'. '+note;
l.style.cssText='position:absolute;left:0;top:-24px;background:#e00;color:#fff;font:600 13px sans-serif;padding:2px 6px;border-radius:3px;white-space:nowrap';
d.appendChild(l)}document.body.appendChild(d);return 'marked'};
window.__unmark=()=>{document.querySelectorAll('.__mark').forEach(x=>x.remove());window.__markN=0;return 'cleared'};
return 'ready'})()
```

Rồi trong cùng lần chạy:

```
--step "eval:window.__mark('.modal','popup confirm submit')"   --step 'shot:MOB-011_476'
--step "eval:window.__unmark()"
--step "eval:window.__mark('#tc-cancel','nút 未確認')"          --step 'shot:MOB-011_0477'
```

Snippet trên **đã chạy thử thành công** ngày 2026-08-26: khoanh đỏ nút `未確認` trong popup
`報告書を提出します。` (overlay hiện đúng vị trí, note `1. nút 未確認` nằm sát trên phần tử).

Quy tắc khoanh đỏ (theo convention team): 1 phần tử → chỉ viền đỏ, không cần note; nhiều phần tử →
viền đỏ + note tiếng Nhật/Việt cạnh mỗi phần tử, tự đánh số.

`__mark` trả 1 trong 4 giá trị — chỉ `marked` là dùng được ảnh, 3 giá trị còn lại phải sửa selector
rồi chụp lại:

| Trả về | Nghĩa |
|---|---|
| `marked` | OK |
| `NOTFOUND:<sel>` | selector không khớp phần tử nào |
| `ZERO-SIZE:<sel>` | khớp phần tử ẩn (rect 0×0) — ảnh sẽ **không** có viền |
| `FULL-VIEWPORT:<sel>` | khớp wrapper phủ kín viewport → viền vẽ ngoài khung ảnh; khoanh phần tử con |

Hai lỗi đã gặp thật (2026-08-26) khi chụp popup submit của MOB-011:
- `.modal` khớp một phần tử ẩn khác trong DOM → `__mark` báo thành công nhưng ảnh không có viền.
  Selector đúng của popup là **`.confirm-modal`**.
- `.confirm-modal` là wrapper full-viewport (744×1133) → viền nằm ngoài khung ảnh. Phải khoanh
  phần tử con **`.modal__inner`** (616×326) mới thấy viền.

Mỗi TC một file riêng theo `TC No.`, không có ngoại lệ. Khi các TC trong nhóm soi **đúng cùng một
ảnh**, vẫn nhân bản ảnh thành từng file theo số TC và upload đủ — xem §3.

### Dữ liệu pre-condition sẵn có

Mỗi TC phải đọc cột G (`Pre-condition`) và dùng đúng bản ghi thoả điều kiện trước khi chụp.
Không dựng được điều kiện thì **để trống cột M và ghi lý do vào cột N** — không chụp màn hình
sai điều kiện.

**Cột G có thể thiếu điều kiện.** Nếu màn hình thực tế khác Expected, kiểm tra lại điều kiện trong
cột H/I trước khi kết luận `NG`. Ca đã gặp (2026-08-26, TC 476): cột G chỉ ghi `MOB-011 (editable)`
+ `is_rejected = 0` + `category = 10-IS_EMERGENCY`, chụp ra dialog `点検報告を提出の確認 /
立会者の署名がありませんが、提出しますか？` — không khớp Expected. Điều kiện còn thiếu nằm trong cột H
(`witnessの署名がすでにある場合`): report phải có `report_signature` với file ảnh chữ ký, vì
`InspectionReport.svelte:383-388` chỉ mở dialog confirm-submit khi
`signature.digitalSignature.url` tồn tại. Ký xong (qua popup `.customer-acknowledgement__signature-image`
→ vẽ trên `.signature-modal__canvas` → `保存`) thì dialog ra đúng Expected.

Đếm trên env 207 ngày 2026-08-26, theo `plan_assignment.eid` = 4 (account chính ở trên):

| Điều kiện TC cần | Số bản ghi |
|---|---|
| `plan.state` = 11 — `IS_REPORT_IN_PROGRESS` 報告書作成中 | 598 |
| `plan.state` = 12 — `IS_REPORT_COMPLETED` 報告書作成済 | 183 |
| `plan.state` = 13 — `IS_REPORT_APPROVED` 報告書承認 | 6 |
| `plan.state` = 20 — `IS_CLIENT_REPORTED` 顧客報告 | 22 |
| `report.is_rejected` = 1 | 517 |
| `report.is_rejected` = 0 | 70 |
| các state khác: 0 / 1 / 10 | 3 / 37 / 22 |

Đủ dữ liệu cho toàn bộ TC luồng vào màn (TC 1–7) và vùng `reject_history` (TC 18–23),
**không cần tạo data mới**. TC 17 (engineer không được assign) dùng chính account `eid` = 4 với
inspection mà `eid` = 4 không có trong `plan_assignment` — xem dòng `Chỉ dùng 1 account` ở bảng trên.

Câu đếm lại khi cần refresh số liệu (read-only, MCP `mysql_207`):

```sql
SELECT p.state, COUNT(*) FROM rezil_esms_inspection.plan p
  INNER JOIN rezil_esms_inspection.plan_assignment pa ON pa.plan_id = p.id
  WHERE pa.eid = 4 GROUP BY p.state ORDER BY p.state;

SELECT r.is_rejected, COUNT(*) FROM rezil_esms_inspection.report r
  INNER JOIN rezil_esms_inspection.plan p ON p.inspection_id = r.inspection_id
  INNER JOIN rezil_esms_inspection.plan_assignment pa ON pa.plan_id = p.id
  WHERE pa.eid = 4 GROUP BY r.is_rejected;
```

---

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
>
> Spec này **trước 2026-08-26 có hướng dẫn dùng `rclone link`** nên các file evidence upload trong
> ngày đó đã bị bật quyền anyone-with-link (đo được 114 file). Kiểm lại bất cứ lúc nào:
> `rclone lsjson -M --drive-metadata-permissions read --drive-root-folder-id "$FOLDER" gdrive-rezil: --files-only | jq -r '.[] | select(.Metadata.permissions // "" | contains("anyoneWithLink")) | .Name'`

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
- Xác nhận đúng tab trước khi ghi: `gid` trong URL không phải tên tab, phải resolve `sheetId` → `title`
  qua Sheets API (`sheets.properties(sheetId,title)`) rồi mới ghi.

---

## Phụ lục: tham chiếu

- Spreadsheet: https://docs.google.com/spreadsheets/d/1XQ9nJEEYIzzgOE12vDMAGYx03ne6NRk_tKtEdewERVA/edit
- Tab MOB-011 (gid=441162473): `MOB-011 点検報告 (Inspection Report)`
- Folder evidence MOB-011: https://drive.google.com/drive/folders/10ZYvBxO9Oa2gbTmibKy6DnCrO_wxYAZB
- Ví dụ folder của sheet khác: https://drive.google.com/drive/folders/1iTncxHQtHoQy1V9f_i9EnPsulVyLj6QM
