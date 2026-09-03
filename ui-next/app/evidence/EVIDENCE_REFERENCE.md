# Tham chiếu evidence (tra khi cần, KHÔNG nhúng vào prompt)

Phần tách khỏi `SCREEN_EVIDENCE.md` ngày 2026-08-27 để prompt của console `/evidence` nhẹ đi: spec
chỉ giữ RULE (nhúng nguyên văn mỗi lượt), còn số đếm, ví dụ, snippet dài và các ca đã gặp nằm ở đây
— đọc ĐÚNG mục cần bằng `sed`, không `cat` cả file:

```bash
sed -n '/^## 3\./,/^## 4\./p' ui-next/app/evidence/EVIDENCE_REFERENCE.md
```

Cùng quy tắc với `SELECTORS_<SCREEN>.md`: lấy đúng đoạn, không nạp cả file vào context.

---

## 1. Số đếm từng tab

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


Đếm lại khi số đã cũ: đọc cột C/J/M của tab rồi tự cộng, không chép lại số ở trên.

### Tab `TEMPLATE-002 Template Detail (View/Edit)` (đo 2026-08-27)

| Chỉ số                | Giá trị                                                                    |
|-----------------------|----------------------------------------------------------------------------|
| Tổng TC               | 104 (TC 1 → 104, row 17 → 124; row header 12)                              |
| Cột M đã có evidence  | 96 (TC 1 → 96)                                                             |
| Cột M trống           | **8** — TC 97 → 104, ô `M117:M124`                                         |
| Result cột J          | 104/104 = `OK`                                                             |
| Định dạng file trong ô| `.webm` và `.png` xen kẽ, 4 ô `.mov`                                        |
| Ô M chứa URL Drive    | 0 — toàn bộ là tên file trần                                                |
| Folder Drive          | `1pBUQuEvk9p475dBXA1PshRLlWWZBD3zS` — 103 file, số `_001` → `_104`, thiếu `_094` `_095`; `_066` có cả `.png` và `.webm`; ext: `.png` 53 · `.webm` 48 · `.mov` 2 |

Sai lệch đã phát hiện trong cột M của tab này (**không tự sửa** — chỉ báo lại người phụ trách):

| TC       | Giá trị ô M                                     | Vấn đề                                                                 |
|----------|-------------------------------------------------|------------------------------------------------------------------------|
| 76       | `TEMPLATE-001_072.png`                          | sai mã màn (trỏ folder TEMPLATE-001); Drive có `TEMPLATE-002_076.png`  |
| 94, 95   | ` TEMPLATE-002_090.mov`, ` TEMPLATE-002_091.mov` | file không tồn tại (Drive chỉ có `_090.webm` / `_091.webm`), và trùng file của TC 90/91; đúng ra phải là `_094` / `_095` — 2 số này đang thiếu trên Drive |
| 23, 56, 88, 89 | có **khoảng trắng đầu** trong tên file     | so tên với Drive phải `trim()` trước khi đối chiếu                     |

8 TC thiếu evidence (97 → 104) đều đã có file `TEMPLATE-002_097.png` → `_104.png` trên Drive
→ chỉ cần gán link, không chụp lại.

### Tab `TEMPLATE-002 (Create/Duplicate)` (đo 2026-08-27)

| Chỉ số                | Giá trị                                                                    |
|-----------------------|----------------------------------------------------------------------------|
| Tổng TC               | 83 (TC **2** → 84, row 17 → 102; không có TC 1)                            |
| Cột M đã có evidence  | 75 (TC 2 → 76)                                                             |
| Cột M trống           | **8** — TC 77 → 84, ô `M95:M102`                                           |
| Result cột J          | 83/83 = `OK`                                                               |
| Ánh xạ file ↔ TC      | file `_NNN` = TC `NNN + 1` (lệch 1 vì TC đầu tiên là 2) — xem SPEC §3      |
| Ô M chứa URL Drive    | 0 — toàn bộ là tên file trần                                                |
| Folder Drive          | `1hr6ZnEoALmzFjHNKKeHfWgdBaLuunnpP` (`TEMPLATE-002_CREATE`) — 78 file, số `_001` → `_079`, thiếu `_076`; ext: `.webm` 64 · `.png` 14 |

Sai lệch: ô M của **TC 51** ghi `TEMPLATE-002_049.webm`, trùng đúng file của TC 50; theo ánh xạ
lệch 1 thì phải là `_050.webm` (file này có trên Drive nhưng chưa TC nào trỏ tới). Không tự sửa.

Dải TC 77 → 84: Drive có `_077` `_078` `_079` chưa ô nào trỏ tới. Theo ánh xạ lệch 1, đó là
evidence của TC 78/79/80 và TC 77 (`_076`) chưa có file. Chưa xác nhận được bằng tên file —
xem mục cần confirm ở SPEC §3 trước khi gán link hoặc chụp mới.

---

## 2. Đặt tên file: ví dụ và di sản trên Drive

|                               | Đúng                                                                       | Sai                                 |
|-------------------------------|----------------------------------------------------------------------------|-------------------------------------|
| TC 496 + 497 dùng chung 1 ảnh | `MOB-011_496.png` **và** `MOB-011_497.png` (2 file, nội dung như nhau)     | `MOB-011_496-497.png` dùng cho cả 2 |
| TC 499 → 502 dùng chung 1 ảnh | `MOB-011_499.png`, `MOB-011_500.png`, `MOB-011_501.png`, `MOB-011_502.png` | `MOB-011_499-502.png`               |

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

## 3. Chụp evidence: các mục chưa verify / thông tin nền

### Khác biệt khi chụp web admin

Đã verify 2026-08-27: web admin là **SvelteKit có URL routing** (repo `rezil-esms/app/src/routes/(admin)/admin/…`),
nên `goto:<url>` dùng được — không phải đi từ `/` như app mobile Ionic. Route đã kiểm của TEMPLATE-002:
`/admin/template` (list) · `/admin/template/<id>` (view/edit) · `/admin/template/create` ·
`/admin/template/<id>/duplicate`. `http://admin.10.9.17.207.nip.io/` và `/admin/template` đều trả HTTP 200.
Cột Steps của 2 tab TEMPLATE-002 ghi URL `admin/mypage{id}` — lỗi copy từ tab MYPAGE, không phải URL thật.

| Khác biệt khi chụp admin | **Chưa verify tính tới 2026-08-26** — mọi mục dưới đây trong bảng này (`Lệnh mẫu`, `Viewport`, `Điều hướng`, `Selector`, `Không được bấm`) đều đo trên web mobile. Trước batch admin đầu tiên phải chạy 1 lần để chốt: preset `--login rezil` có khớp form login admin không · viewport desktop dùng thay cho `744×1133` · selector BEM của màn admin. Cờ GPS ở dòng `GPS` chỉ cần cho luồng submit của app mobile; nếu màn admin cũng chặn theo vị trí thì phải đổi origin trong cờ thành `http://admin.10.9.17.207.nip.io` |

### Khi nào cần headed

| Khi nào cần headed | Chỉ khi phải login tay (SSO/Entra ID, MFA) hoặc profile mất session: chạy 1 lần `--profile <ten> --profile-login`, đăng nhập rồi đóng cửa sổ, sau đó quay lại headless |

### Account chính là ai

| Account đó là ai | `user.id` = 4 (`user.name` = `Admin`, `state` = 1), engineer `eid` = 4 / code `G-00004` / `engineerName` = `nghiadv test ep`, group `gid` = 4 (`YenLTB`). App mobile chỉ cho login khi user có bản ghi `engineer` và `/api/v1/auth/me` trả `engineerId` → account này **là engineer hợp lệ**; `user.name` = `Admin` chỉ là tên hiển thị, không phải role |

### Quyền group

| Quyền group | Không kiểm trước quyền của group `YenLTB` (gid 4). TC nào bị chặn quyền sẽ lộ ra lúc chụp → xử lý như TC không dựng được điều kiện |

---

## 4. Tái sử dụng evidence: ví dụ, snippet `__mark`, cạm bẫy đã gặp

Ví dụ TC 476 / 477 / 478 đều nằm trong popup `報告書を提出します。`:

| TC  | Kiểm tra                               | Vùng khoanh đỏ    |
|-----|----------------------------------------|-------------------|
| 476 | Nội dung dialog (title / body / 2 nút) | Cả popup          |
| 477 | Nút `未確認` (cancel)                     | Riêng nút `未確認`   |
| 478 | (TC kế tiếp trong cùng popup)          | Phần tử tương ứng |

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


---

## 5. Pre-condition: ca đã gặp + số đếm trên env 207

**Cột G có thể thiếu điều kiện.** Nếu màn hình thực tế khác Expected, kiểm tra lại điều kiện trong
cột H/I trước khi kết luận `NG`. Ca đã gặp (2026-08-26, TC 476): cột G chỉ ghi `MOB-011 (editable)`
+ `is_rejected = 0` + `category = 10-IS_EMERGENCY`, chụp ra dialog `点検報告を提出の確認 /
立会者の署名がありませんが、提出しますか？` — không khớp Expected. Điều kiện còn thiếu nằm trong cột H
(`witnessの署名がすでにある場合`): report phải có `report_signature` với file ảnh chữ ký, vì
`InspectionReport.svelte:383-388` chỉ mở dialog confirm-submit khi
`signature.digitalSignature.url` tồn tại. Ký xong (qua popup `.customer-acknowledgement__signature-image`
→ vẽ trên `.signature-modal__canvas` → `保存`) thì dialog ra đúng Expected.

Đếm trên env 207 ngày 2026-08-26, theo `plan_assignment.eid` = 4 (account chính ở trên):

| Điều kiện TC cần                                   | Số bản ghi  |
|----------------------------------------------------|-------------|
| `plan.state` = 11 — `IS_REPORT_IN_PROGRESS` 報告書作成中 | 598         |
| `plan.state` = 12 — `IS_REPORT_COMPLETED` 報告書作成済   | 183         |
| `plan.state` = 13 — `IS_REPORT_APPROVED` 報告書承認     | 6           |
| `plan.state` = 20 — `IS_CLIENT_REPORTED` 顧客報告      | 22          |
| `report.is_rejected` = 1                           | 517         |
| `report.is_rejected` = 0                           | 70          |
| các state khác: 0 / 1 / 10                         | 3 / 37 / 22 |

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


---

## 6. Quyền anyone-with-link đã lỡ cấp (2026-08-26)

>
> Spec này **trước 2026-08-26 có hướng dẫn dùng `rclone link`** nên các file evidence upload trong
> ngày đó đã bị bật quyền anyone-with-link (đo được 114 file). Kiểm lại bất cứ lúc nào:
> `rclone lsjson -M --drive-metadata-permissions read --drive-root-folder-id "$FOLDER" gdrive-rezil: --files-only | jq -r '.[] | select(.Metadata.permissions // "" | contains("anyoneWithLink")) | .Name'`

---

## 7. Phụ lục: tham chiếu


- Spreadsheet: https://docs.google.com/spreadsheets/d/1XQ9nJEEYIzzgOE12vDMAGYx03ne6NRk_tKtEdewERVA/edit
- Tab MOB-011 (gid=441162473): `MOB-011 点検報告 (Inspection Report)`
- Folder evidence MOB-011: https://drive.google.com/drive/folders/10ZYvBxO9Oa2gbTmibKy6DnCrO_wxYAZB
- Ví dụ folder của sheet khác: https://drive.google.com/drive/folders/1iTncxHQtHoQy1V9f_i9EnPsulVyLj6QM
- Tab `TEMPLATE-002 Template Detail (View/Edit)`: https://drive.google.com/drive/folders/1pBUQuEvk9p475dBXA1PshRLlWWZBD3zS (folder `TEMPLATE-002`)
- Tab `TEMPLATE-002 (Create/Duplicate)`: https://drive.google.com/drive/folders/1hr6ZnEoALmzFjHNKKeHfWgdBaLuunnpP (folder `TEMPLATE-002_CREATE`)
- Folder cha chứa mọi folder evidence theo màn (shared-with-me): `REZ001_レジル電気保安株式会社様_基幹システムと関連システムのリニューアル/02_Development/23_Testing/Test Evidence/`
