# Selector đã verify — MOB-011 点検報告 (Inspection Report)

Bản đồ selector dùng cho việc chụp evidence màn MOB-011 trên web mobile
`http://mobile.10.9.17.207.nip.io`. Mục đích: **không phải dò lại selector mỗi lượt** — phiên
2026-08-26 có 22/45 lần chạy `debug.mjs` ra 0 ảnh chỉ vì đi dò.

Quy ước:

- **Mỗi màn một file**: `SELECTORS_<SCREEN>.md` nằm cạnh `SCREEN_EVIDENCE.md`. Màn mới → thêm file mới.
- Chỉ ghi selector **đã chạy thật** trên env 207, kèm cột "Verify" (ngày) và cột "Nguồn"
  (`file:line` trong repo `rezil-esms-mobile/app/src`) để đối chiếu khi app đổi markup.
- Selector sai / không còn khớp thì **sửa tại đây ngay trong lượt phát hiện**, kèm ngày mới. Không
  để lượt sau dò lại từ đầu.
- **Không** dùng class hash của Svelte (`s-5xw9RGpuDz7F`) — hash đổi theo build.

---

## 1. Selector ổn định (class BEM)

| Selector                                                | Phần tử                                                                  | Màn / trạng thái   | Nguồn (`rezil-esms-mobile/app/src`)                                                       | Verify     |
|---------------------------------------------------------|--------------------------------------------------------------------------|--------------------|-------------------------------------------------------------------------------------------|------------|
| `.tabs__item`                                           | 1 tab trong dải tab của màn Home (`本日の予定` / `点検報告未完了` / `点検計画未確定`)       | Home               | `features/home/components/TabsMenu.svelte:37`                                             | 2026-08-26 |
| `.card`                                                 | 1 thẻ inspection trong danh sách                                         | Home, các tab      | `features/home/components/UnplannedCard.svelte`                                           | 2026-08-26 |
| `.plan-title`                                           | Tên inspection trên thẻ — click để mở báo cáo                            | Home               | `features/home/components/UnplannedCard.svelte:135`                                       | 2026-08-26 |
| `.card__actions button, .card__actions ion-button`      | Nút hành động trên thẻ (`報告書修正`…)                                        | Home               | `features/home/components/UnplannedCard.svelte:147`                                       | 2026-08-26 |
| `ion-tab-button`                                        | Tab dưới cùng (`ホーム` / `予定` / `事業場` / `設備`)                              | Toàn app           | Ionic tab bar                                                                             | 2026-08-26 |
| `.calendar__day`                                        | 1 ô ngày trong lịch tháng                                                | 予定 → xem tháng     | `features/plan/components/list/MonthView.svelte:124`                                      | 2026-08-26 |
| `.calendar-item__name`                                  | Tên kế hoạch trong ô ngày                                                | 予定                 | `features/plan/components/list/CalendarItem.svelte:35`                                    | 2026-08-26 |
| `.timeline__event-name`                                 | Tên event trong modal xem theo ngày                                      | 予定 → modal ngày    | `features/plan/components/list/DailyViewModal.svelte:176`                                 | 2026-08-26 |
| `.header__title`                                        | Tiêu đề header — dùng để xác nhận đang ở đúng màn                        | Toàn app           | `lib/components/header/Header.svelte:67`                                                  | 2026-08-26 |
| `.confirm-modal`                                        | **Wrapper** dialog confirm (phủ kín viewport)                            | Mọi dialog confirm | `lib/components/modals/ConfirmModal.svelte:58`                                            | 2026-08-26 |
| `.modal__inner`                                         | **Khung nội dung** của dialog — selector cần khoanh đỏ                   | Mọi dialog         | `lib/components/Modal.svelte:164`                                                         | 2026-08-26 |
| `.confirm-modal button, .confirm-modal ion-button`      | 2 nút trong dialog confirm                                               | Dialog confirm     | `lib/components/modals/ConfirmModal.svelte`                                               | 2026-08-26 |
| `.customer-acknowledgement__signature-image`            | Ô ảnh chữ ký của người chứng kiến — click để mở popup ký                 | MOB-011 (editable) | `features/inspection-report/components/CustomerAcknowledgement.svelte:292`                | 2026-08-26 |
| `.signature-modal__canvas`                              | Canvas để vẽ chữ ký                                                      | Popup ký           | `features/inspection-report/components/SignatureModal.svelte:191`                         | 2026-08-26 |
| `.report-submitted-modal__actions button, … ion-button` | Nút trong modal "đã submit" (`ホームへ移動`)                                   | Sau khi submit     | `features/inspection-report/components/ReportSubmittedModal.svelte:51`                    | 2026-08-26 |
| `.next-inspection-modal__content`                       | Vùng nội dung modal 次回点検                                                 | Modal 次回点検         | `features/inspection-report/components/NextInspectionModal.svelte:147`                    | 2026-08-26 |
| `.next-inspection-modal__actions button, … ion-button`  | Nút trong modal 次回点検                                                     | Modal 次回点検         | `features/inspection-report/components/NextInspectionModal.svelte:157`                    | 2026-08-26 |
| `.annual-subtitle > p`                                  | Dòng phụ đề của khối 年次 trong modal 次回点検                                 | Modal 次回点検         | `features/inspection-report/components/NextInspectionModal.svelte:168`                    | 2026-08-26 |
| `.issue-detail__list-item`                              | 1 dòng trong danh sách 指摘事項                                              | MOB-011            | `features/inspection-report/components/IssueDetail.svelte:96`                             | 2026-08-26 |
| `.remark-detail`                                        | Khối 備考                                                                  | MOB-011            | `features/inspection-report/components/RemarkDetail.svelte:93`                            | 2026-08-26 |
| `.tabs__button`                                         | **Nút thật** bên trong `.tabs__item` — phải click cái này mới đổi tab    | Home               | `features/home/components/TabsMenu.svelte:39`                                             | 2026-08-26 |
| `.report__section.summary`                              | Khối 3.1.1a 一般情報 (General Summary)                                       | MOB-011            | `features/inspection-report/pages/InspectionReport.svelte:522`                            | 2026-08-26 |
| `.report__section.detail`                               | Khối chi tiết (特記事項 / 指摘事項 / 点検項目)                                       | MOB-011            | `features/inspection-report/pages/InspectionReport.svelte:628`                            | 2026-08-26 |
| `.summary__table`                                       | Bảng của General Summary — cấu trúc `<th>`(nhãn)/`<td>`(giá trị) liền kề | MOB-011            | `features/inspection-report/components/BasicInfo.svelte:25`                               | 2026-08-26 |
| `th.label` / `th.cat` / `td`                            | Ô nhãn / ô nhóm / ô giá trị trong bảng 点検表 (Cubicle…)                    | MOB-011 detail     | `features/inspection-report/components/renovation/RenovationCheckSheetTable.svelte:90,92` | 2026-08-26 |
| `.issue-detail__list`                                   | Danh sách 指摘事項 (詳細) — bọc các `__list-item`                              | MOB-011            | `features/inspection-report/components/IssueDetail.svelte:93`                             | 2026-08-26 |
| `.report-submitted-modal__content`                      | Vùng title + subtitle của modal 報告書提出が完了しました                             | Sau khi submit     | `features/inspection-report/components/ReportSubmittedModal.svelte:42`                    | 2026-08-26 |
| `.annual-radio-row`                                     | Hàng chọn 無停電 / 停電 trong modal 次回点検 (annual)                             | Modal 次回点検 annual  | `features/inspection-report/components/NextInspectionModal.svelte:177`                    | 2026-08-26 |
| `.radio-pill--selected`                                 | Lựa chọn đang chọn — mặc định `2-IS_ANNUAL_NO_OUTAGE`                    | Modal 次回点検 annual  | `features/inspection-report/components/NextInspectionModal.svelte:182`                    | 2026-08-26 |
| `.annual-history`                                       | Khối 前回 / 前々回 / 停電周期                                                     | Modal 次回点検 annual  | `features/inspection-report/components/NextInspectionModal.svelte:191`                    | 2026-08-26 |
| `h3`                                                    | Header 4 nhóm 項目グループ (点検表 / 継電器試験 / 測定 / 耐圧試験)                           | MOB-011 detail     | do `Typography tag="h3"` render — `lib/components/Typography.svelte:30`                   | 2026-08-26 |

## 2. Cạm bẫy đã gặp (đọc trước khi khoanh đỏ)

| Hiện tượng                                                                                                                                            | Nguyên nhân                                                                                                                                                                                                  | Cách làm đúng                                                                                                                                                                                                     |
|-------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `__mark` trả `marked` nhưng ảnh **không có viền đỏ**                                                                                                  | `.modal` khớp một phần tử **ẩn** khác trong DOM                                                                                                                                                              | Dùng `.confirm-modal`, không dùng `.modal`                                                                                                                                                                        |
| Viền đỏ vẽ ngoài khung ảnh                                                                                                                            | `.confirm-modal` là wrapper phủ kín viewport (744×1133)                                                                                                                                                      | Khoanh phần tử con `.modal__inner` (616×326)                                                                                                                                                                      |
| Selector khớp 0 phần tử sau khi app build lại                                                                                                         | Dùng class hash Svelte                                                                                                                                                                                       | Chỉ dùng class BEM ở bảng §1                                                                                                                                                                                      |
| Nút cần bấm không có class riêng                                                                                                                      | Nhiều nút dùng chung `button` / `ion-button`                                                                                                                                                                 | Dùng công thức tìm theo text ở §3                                                                                                                                                                                 |
| Click `.tabs__item` **không đổi tab** (kể cả `.click()` hay dispatch pointerdown/mousedown/pointerup/mouseup)                                         | Handler nằm ở `<button class="tabs__button">` bên trong, không phải div bọc                                                                                                                                  | Click `.tabs__item .tabs__button` — xem §1                                                                                                                                                                        |
| `__mark` trả `ZERO-SIZE` dù phần tử "đang hiển thị"                                                                                                   | Nav stack Ionic giữ DOM của các màn trước; `querySelector` bắt trúng node của màn cũ                                                                                                                         | Lọc `getBoundingClientRect().width>0 && height>0` **trước** khi lấy phần tử                                                                                                                                       |
| Khoanh trúng bảng nhưng sai thiết bị                                                                                                                  | Một report có **nhiều bảng cùng tiêu đề** `◆キュービクル・電気室点検表` khi số thiết bị vượt 4 cột/bảng                                                                                                                   | `querySelectorAll` rồi lọc theo index, không lấy phần tử đầu tiên                                                                                                                                                 |
| Mở nhầm inspection dù regex khớp                                                                                                                      | `.plan-title` **không phải lúc nào cũng bắt đầu bằng `plan.id`** — nhiều bản ghi test đặt title tự do (`Site_new`, `yenltb test INSP003`)                                                                    | Tra `plan.title` trong DB trước, rồi neo `^<plan_id>` và **in ra title đã chọn để kiểm**                                                                                                                          |
| Bảng/section cao hơn khung 1133px → `marked` nhưng viền ngoài ảnh                                                                                     | Viewport cố định 744×1133, `__mark` chỉ kiểm ngưỡng 98% cả 2 chiều                                                                                                                                           | Cuộn tới đúng hàng cần soi trước khi chụp, hoặc chia 2 ảnh `_1`/`_2`                                                                                                                                              |
| Không thấy giá trị `__mark` trả về                                                                                                                    | `--step eval:` **không** in kết quả ra stdout (chỉ `--eval` mới in)                                                                                                                                          | Gộp nhiều `__mark` vào 1 eval rồi `return` chuỗi kết quả, hoặc để lệnh cuối dùng `--eval`                                                                                                                         |
| Lệnh chạy xong nhưng không có ảnh nào                                                                                                                 | Gộp `--keep-stop` chung với các `--step` khác → toàn bộ step bị bỏ qua, chỉ Chrome bị đóng                                                                                                                   | Để `--keep-stop` thành lệnh riêng, chạy sau cùng                                                                                                                                                                  |
| `th.label` tra bằng `innerText.trim() === '<TÊN FIELD>'` ra `NOTFOUND` dù field có tồn tại                                                            | Nhãn 2 dòng (label bọc trong ngoặc, vd `換気装置の状態(換気扇・ガラリ等)`, `消防法による消火器の設置状況`) có **newline thật** trong `innerText` giữa 2 dòng hiển thị                                                                     | So sánh sau khi chuẩn hoá khoảng trắng: `norm = s => s.replace(/\s+/g,''); norm(e.innerText) === norm('<TÊN FIELD>')`                                                                                             |
| `--keep <ten>` tưởng attach lại Chrome cũ nhưng thực ra mở Chrome mới (port đổi)                                                                      | Chrome keep-alive lần trước đã chết (crash/bị dọn) giữa 2 lần gọi `debug.mjs`, file `.chrome-profiles/.keep-<ten>.json` trỏ port cũ không còn sống → script tự phát hiện, âm thầm mở Chrome mới cùng profile | Sau mỗi lần gọi có `--keep`, đọc log dòng "Chrome keep-alive ... vừa mở (port ...)" — nếu port đổi so với lần trước nghĩa là session/trang đã mất, phải dựng lại flow từ đầu (nav qua Home) thay vì chỉ mark tiếp |
| Attach lại bằng `--keep <ten>` (không phải lần mở đầu) mà `innerWidth`/`innerHeight` trả về mặc định 1280×800, không phải kích thước đã truyền lúc mở | Viewport chỉ được set lại nếu **truyền `--width`/`--height` trên chính lệnh đó**; không truyền → CDP reset về default mỗi lần attach                                                                         | **Luôn kèm `--width 744 --height 1133` trên MỌI lệnh** dùng `--keep <ten>`, kể cả các lệnh sau lệnh mở đầu, không chỉ lệnh đầu tiên                                                                               |
| Marker `__mark(el, note)` che mất chữ trong ô nhãn hẹp (cột `th.label` hẹp, banner note to hơn ô)                                                     | Banner note vẽ đè góc trên-trái phần tử, ô nhỏ thì banner phủ kín chữ gốc                                                                                                                                    | Khi cần **thấy được chữ** bên trong nhiều ô cùng lúc (vd liệt kê hết field label cho TC "Item type"), gọi `__mark(el)` **không kèm note** — chỉ có viền đỏ, không có banner che                                   |
| `th.label` của bảng `遮断器点検表` / `開閉器・断路器点検表` (`RenovationCheckSheetTable`?) gắn class `label` cho **MỌI** hàng kể cả `判定` và `備考`                      | Khác với bảng Cubicle (`キュービクル・電気室点検表`) — ở đó `判定` KHÔNG có class `th.label` (ghi tại §6b). Có vẻ mỗi loại bảng 点検表 dùng component/markup hơi khác nhau                                                     | Trước khi tra `判定`/`備考` bằng `document.querySelectorAll('th')` (bỏ `.label`), **thử trước** bằng `th.label` — nếu ra kết quả thì dùng luôn, đỡ phải fallback                                                      |

## 3. Công thức tìm nút theo nhãn rồi gán id tạm

`debug.mjs` không có selector theo text. Cách đã dùng được: `--step eval:` tìm phần tử theo nhãn,
gán `id` tạm, rồi `click:#<id>` / `__mark('#<id>')`.

```js
// gán id tạm cho nút mang nhãn <LABEL> trong phạm vi <SCOPE> (mặc định cả trang)
(() => { const t = [...document.querySelectorAll('<SCOPE> button, <SCOPE> ion-button')]
  .find(e => e.textContent.trim().includes('<LABEL>'));
  if (!t) return 'NOTFOUND'; t.id = 'tc-target'; return 'ok'; })()
```

Các nhãn đã dùng (verify 2026-08-26):

| Nhãn                       | Phạm vi tìm                        | Việc                                                          |
|----------------------------|------------------------------------|---------------------------------------------------------------|
| `予定`                       | `ion-tab-button`                   | sang tab lịch                                                 |
| `報告書を確認`                   | `button, ion-button`               | vào chế độ Confirm của báo cáo                                |
| `報告書を提出する`                 | `button, ion-button`               | mở dialog 1 của luồng submit                                  |
| `提出する`                     | `.confirm-modal`, `.modal__inner`  | nút xác nhận trong dialog — **là bước gây mutation, xem §4**  |
| `確認しました`                   | `.confirm-modal`                   | nút xác nhận cuối — **gây mutation**                          |
| `ホームへ移動`                   | `.report-submitted-modal__actions` | về Home sau khi submit                                        |
| `報告書作成` / `報告書修正`          | `.card__actions`                   | mở MOB-011 từ thẻ ở Home (nhãn đổi theo `report.is_rejected`) |
| `詳細へ移動する`                  | popup của `.timeline__event-name`  | từ lịch 予定 sang MOB-008 点検計画詳細                                |
| `次回の計画詳細へ移動`               | `.next-inspection-modal__actions`  | sang MOB-008 của next plan (monthly)                          |
| `点検種別を選択して、次回の月次点検計画詳細を確認` | `.next-inspection-modal__actions`  | nút xác nhận của modal 次回点検 annual                            |

## 4. Nút KHÔNG được bấm khi TC không yêu cầu

`確認しました` · `提出する` · `承認` · `削除` · `点検開始を取り消し` · `点検再開`. Chuỗi dialog submit
(verify 2026-08-26): `報告書を確認` → `報告書を提出する` → dialog 1 `点検報告を提出の確認` (hoặc
`立会者の署名がありませんが、提出しますか？` khi chưa ký) → `提出する` → dialog 2 `報告書を提出します。` →
`確認しました` → `PUT /api/v1/inspection/report/submit/<report_id>`. **Dừng ở dialog 2 vẫn chưa
mutation.** Chi tiết + luồng resubmit: `SCREEN_EVIDENCE.md` §4.

## 5. Ràng buộc điều hướng

App là Ionic, điều hướng bằng nav stack (`root = <component>` trong `app/src/App.svelte`), **không có
URL routing** → không `goto` được URL màn trong. Mọi TC phải đi từ `/` rồi click qua từng bước; dùng
`--keep` để giữ trạng thái giữa các lệnh (xem `SCREEN_EVIDENCE.md` §4).

### 5.1 Đường đi tới MOB-011 — ưu tiên đi qua Home (verify 2026-08-26)

Home render **đủ 530 card trong DOM**, không ảo hoá, nên tìm bằng text là được — nhanh hơn hẳn đi
đường lịch. Dùng cho mọi plan nằm trong tab `点検報告未完了` (`plan.state` = 11 / 12):

1. Về đúng tab: tìm `.tabs__item` chứa `報告未完了` → lấy `.tabs__button` bên trong → `click`.
   Profile Chrome **nhớ tab của lần chạy trước**, nên bước này bắt buộc, đừng giả định đang ở tab mặc định.
2. Tìm thẻ theo `plan.id` rồi mở: `.plan-title` khớp `^<plan_id>` → `.closest('.card')` →
   `.card__actions button, .card__actions ion-button` → gán id tạm → `click` → `wait:9000..10000`.
   **In ra title đã chọn và kiểm trước khi thao tác tiếp** (xem cạm bẫy ở §2).
3. Màn mở ở edit mode. Cần chế độ xem thì bấm `報告書を確認` — nút này chỉ đổi cách hiển thị, không ghi dữ liệu.

### 5.2 Đường đi qua lịch — chỉ khi plan KHÔNG nằm trong tab 点検報告未完了

Ví dụ `plan.state` = 13 / 20. Đường đi: `ion-tab-button` `予定` → lưới tháng.
**Lưới tháng chỉ hiện tối đa 2 item mỗi ngày**, phần còn lại gộp vào `他N件` → plan cần tìm có thể
không có trong DOM. Phải click ô ngày `.calendar__day` để mở modal xem theo ngày, rồi tìm
`.timeline__event-name`, `scrollIntoView` → `click` → popup thông tin → `詳細へ移動する` → MOB-008
点検計画詳細 → nút vào báo cáo (`報告書確認` khi state 20, `報告書作成`/`報告書修正` khi state 11).

Ngày hiển thị trên lịch lấy theo giờ địa phương, lệch với `plan.work_start` đọc từ DB (trả về UTC) —
tra ngày bằng lịch, đừng suy từ chuỗi ISO trong DB.

## 6. Công thức tra ô trong bảng (General Summary & bảng 点検項目)

Hai khối dữ liệu chính của MOB-011 đều là `<table>` thật, tra theo **text của ô nhãn** là cách bền
nhất — không phụ thuộc hash class Svelte, không phụ thuộc thứ tự cột.

```js
// (a) General Summary — cặp <th>(nhãn) / <td>(giá trị) LIỀN KỀ trong cùng <tr>
(() => { const sec = document.querySelector('.report__section.summary');
  const th = [...sec.querySelectorAll('th')].find(e => e.innerText.trim() === '<NHÃN>');
  if (!th) return 'NOTFOUND';
  return window.__mark(th, 'nhãn') + ',' + window.__mark(th.nextElementSibling, 'giá trị'); })()
```

Nhãn đã verify (2026-08-26): `事業場ID` · `実施日時` · `受電総容量` · `予備発電容量` · `事業場名` ·
`点検者` · `天候` · `気温` · `湿度` · `作業者`.

```js
// (b) Bảng 点検項目 (Cubicle…) — cấu trúc tr > th.cat[rowspan] | th.label | td...
//     Lọc phần tử hiển thị TRƯỚC để tránh bắt trúng node của màn cũ trong nav stack.
(() => { const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const th = [...document.querySelectorAll('th.label')].filter(vis)
    .find(e => e.innerText.trim() === '<TÊN FIELD>');
  if (!th) return 'NOTFOUND';
  const tds = [...th.closest('tr').querySelectorAll('td')].filter(vis);
  return [window.__mark(th, 'nhãn'), ...tds.map((t, i) => window.__mark(t, 'giá trị ' + (i + 1)))].join(','); })()
```

Tên field đã verify trên bảng `キュービクル・電気室点検表` (2026-08-26): `設置場所` · `製造者` ·
`型式` · `製造番号` · `製造年` · `周囲の状況` · `扉の変形・変色` · `扉の発錆・腐食` ·
`扉の開閉状況` · `扉の施錠` · `雨水等の浸入・吹込み` · `小動物の浸入` · `標識` · `基礎部分の状態` ·
`保護板の状態` (2026-08-27, thêm) `接地線の状況` · `照明点灯状況` · `換気装置の状態(換気扇・ガラリ等)`
· `消防法による消火器の設置状況` · `判定`. Giá trị hiển thị dạng ký hiệu `○` / `△` / `×` / `−`; ô rỗng ra `-`.

3 field cuối cùng (`換気装置の状態(換気扇・ガラリ等)`, `消防法による消火器の設置状況`, và mọi nhãn 2 dòng
khác) có **newline thật** trong `innerText` — dùng công thức chuẩn hoá khoảng trắng ở §2 (dòng
"newline thật"), không so sánh trực tiếp bằng `===`. `判定` KHÔNG có class `th.label` (chỉ `th` trơn,
nằm ở hàng cuối bảng, không phải `th.cat`) — tra bằng `document.querySelectorAll('th')` (bỏ
`.label`) rồi lọc `innerText.trim() === '判定'`, `closest('tr')` vẫn ra đúng `<td>` cùng hàng.

DB (`rezil_esms_inspection.inspection_cubicle`) mapping ENUM `CheckType` đối chiếu 1:1 với ký hiệu
UI (verify bằng inspection `990017070`, 2 cột 製造番号 353/879): `2` → `○` · `1` → `△` · `0` → `−` ·
`-1` → `×`. Field DB tương ứng field UI cùng tên tiếng Anh (`chk_rainwater_ingress` ↔
`雨水等の浸入・吹込み`, v.v.) — không cần tra riêng, chỉ đọc snake_case suy ra tên cột.

Khi report có **nhiều bảng cùng tiêu đề**, thu hẹp phạm vi bằng cách gán id tạm cho đúng bảng trước:

```js
(() => { const p = [...document.querySelectorAll('p')].filter(e => /<TÊN BẢNG>/.test(e.innerText));
  const t = p[<INDEX>].parentElement.querySelector('table');
  if (!t) return 'NOTFOUND'; t.id = 'tc-table'; return 'ok:' + p.length + ' bảng'; })()
```

## 7. Sai lệch dữ liệu đã ghi nhận (không phải lỗi selector)

Ghi lại để lượt sau khỏi mất công dò tưởng là hỏng selector. **Chưa được người phụ trách kết luận.**

| Hiện tượng                                                            | Bản ghi                                                                    | Số liệu đối chiếu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Verify     |
|-----------------------------------------------------------------------|----------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------|
| Màn chỉ render **4/5 nhóm** 項目グループ — thiếu `⑤ 絶縁性能試験`                 | plan `990018070`, inspection `990017070`, `category` = 21                  | `document.querySelectorAll('h3')` = 4; quét toàn DOM không có node nào chứa `絶縁性能`. DB **có** dữ liệu: `inspection_insulation_performance_setting` 1 bản ghi, `inspection_insulation_performance` 1 bản ghi. Cả 5 plan `category` = 21 của `eid` = 4 đều có dữ liệu nhóm này                                                                                                                                                                                                                                                                                                                                        | 2026-08-26 |
| Bảng Cubicle hiển thị **2/3** bản ghi                                 | inspection `990017070`                                                     | `inspection_cubicle` có id 57, 59, 73; UI chỉ hiện id 59 (製造番号 353) và 73 (879). Bản ghi id 57 (`site_location_id` 80264, serial `1`) không xuất hiện — chưa rõ điều kiện lọc                                                                                                                                                                                                                                                                                                                                                                                                                                       | 2026-08-26 |
| Bảng High-Voltage Cable (`◆高圧ケーブル点検表`) hiển thị **1/2** bản ghi       | inspection `990017070`                                                     | `inspection_high_voltage_cable` có id 3 (`site_location_id` 37 主電気室, 回路名 35345) và id 4 (`site_location_id` **80264**, 回路名 111). UI chỉ hiện 1 cột dữ liệu (id 3); id 4 không xuất hiện — cùng `site_location_id` 80264 với bản ghi Cubicle id 57 bị ẩn ở dòng trên, nghi cùng nguyên nhân (site_location 80264 không tồn tại trong `rezil_esms.site_location`)                                                                                                                                                                                                                                                     | 2026-08-27 |
| Bảng `◆コンデンサ・リアクトル点検表` **không render cả bảng** (không chỉ ẩn 1 hàng) | inspection `990017070` (plan `990018070`, pre-condition MOB-011 TC670-679) | `inspection_capacitor_reactor` có 1 bản ghi (id 2, `site_location_id` **80264**, cùng site_location không tồn tại nêu trên) nhưng `document.querySelectorAll('p')` lọc theo `/点検表/` không thấy `◆コンデンサ・リアクトル点検表` trong DOM — khác cơ chế "ẩn hàng" của Cubicle/Cable, ở đây khi record duy nhất bị lọc mất thì cả bảng (kể cả `<p>` tiêu đề) không render. Fallback dùng plan `990018030` ("yenltb test INSP003", inspection `990017030`, state 11, site_location_id 37 主電気室 hợp lệ) để chụp TC676-679 — record `inspection_capacitor_reactor` id 1 có đủ giá trị enum đa dạng (2,1,-1,-1,0,0,0) và chk_decision=-1 | 2026-08-27 |

## 8. Bảng `遮断器点検表` (Circuit Breaker) & `開閉器・断路器点検表` (Switch/Disconnector) — verify TC 660–669

Cả 2 bảng cùng cấu trúc `tr > th.cat[rowspan] | th.label | td` như §6b, **khác Cubicle ở chỗ `th.label`
có mặt trên MỌI hàng** (xem cạm bẫy §2). Scoping bằng công thức §6 cuối (tìm `<p>` chứa tiêu đề `◆...`,
lấy `table` con, gán `id` tạm) — cả 2 bảng chỉ xuất hiện **1 lần** trên report `990017070` (không cần
lọc theo index).

Field label đã verify (2026-08-27), inspection `990017070`, record duy nhất mỗi bảng:

- **遮断器点検表** (`inspection_circuit_breaker`): `設置場所` `機器名` `回路名` `定格` `製造者` `型式`
  `製造番号` `製造年` `各端子部締め付け・過熱` `本体の発錆・損傷` `制御回路・コイルの異常` `操作回数計の表示`
  `操作機構の状態` `接地線の取り付け状態` `判定` `備考`. Field `chk_opt1_label`/`chk_opt2_label` (nhãn tự
  do do user nhập) render label = giá trị cột đó luôn, không phải tên field cố định — record test này
  nhập `"1\n1\n1\n1\n1"` nên label hiện y vậy; `chk_opt1_status`/`chk_opt2_status` đều `NULL` → ô giá
  trị hiện `-`, dùng làm case No-data (TC665) tốt vì các field khác trong bảng đều có dữ liệu.
- **開閉器・断路器点検表** (`inspection_switch_disconnector`): thêm `ヒューズ容量` `内蔵機器`
  `緩衝装置の良否` `開閉器の入切表示` `ヒューズの取付け状態` `接触部の損傷・過熱` `亀裂・損傷`
  `ストライカーの動作` so với circuit breaker (không có `chk_opt1`/`chk_opt2` ở record test này —
  DB trả về nhãn số `67657`/`676767` thay vì opt1/opt2 label 2 dòng).

Mapping enum `chk_decision`/mọi `chk_*_status` verify lại khớp mapping chung: record test có toàn bộ
status = `1` → hiện `△` đồng loạt (kể cả `判定`).

## 9. Nhóm ② 継電器試験 — bảng OCR và họ hàng (verify TC 710–729, 2026-08-27)

**Cấu trúc khác hẳn nhóm ① 点検表.** Các bảng 点検表 xếp dọc (`th.label` mỗi hàng, giá trị ở `td` cùng
hàng); bảng 継電器試験 xếp **ngang**: nhãn là `<th>` ở hàng header, giá trị là `<td>` ở hàng dưới.
Hệ quả: **mọi công thức `th.label` ở §6b đều trả `NOTFOUND` trên nhóm này** — đã mất 2 lần chụp lại vì
lỗi đó.

Nguồn: `features/inspection-report/components/renovation/RenovationOcrTable.svelte`.

### 9.1 Một khối `登録N` = 3 bảng rời, KHÔNG có div bao

`◆過電流継電器試験(OCR)/登録1` gồm **3 `<table>` anh em** nằm sau `<p class="title">`, không có phần tử
cha riêng. Leo `parentElement` để tìm wrapper sẽ lên thẳng gốc trang (bắt 50 bảng, `__mark` trả
`FULL-VIEWPORT`). Cách đúng là gom **sibling** cho tới `p.title` kế tiếp:

```js
(() => { const p = [...document.querySelectorAll('p.title')].find(e => e.innerText.includes('(OCR)/登録1'));
  const out = []; let n = p.nextElementSibling;
  while (n) { if (n.matches && n.matches('p.title')) break;
              if (n.querySelector && n.querySelector('p.title')) break;
              out.push(n); n = n.nextElementSibling; }
  window.__blk = out; window.__ttl = p; return 'blk=' + out.length; })()   // → blk=3
```

| Index      | Bảng con                    | Nguồn                          | Nội dung            |
|------------|-----------------------------|--------------------------------|---------------------|
| `__blk[0]` | 継電器仕様                       | `RenovationOcrTable.svelte:46` | 使用場所 + 6 field spec |
| `__blk[1]` | 整定値 / 特性 / 限時要素 / 瞬時要素 / 判定 | `:80`                          | ma trận pha R/T     |
| `__blk[2]` | 備考                          | —                              | 1 hàng              |

Khoanh cả khối (TC "Get data (SQL)") = mark cả 3 phần tử; khoanh từng block (TC "Layout block/table")
= mark từng phần tử kèm note. Cuộn bằng `window.__ttl.scrollIntoView({block:'start'})` để cả khối lọt khung.

### 9.2 Tra field trong bảng 継電器仕様 — dùng THỨ TỰ CỘT, không dùng text-to-td

`<th>` có `rowspan`/`colspan` (`使用場所` rowspan=2, `継電器仕様` colspan=6) nên `th.cellIndex` KHÔNG
khớp `td.cellIndex`. Cách chạy đúng: cố định thứ tự cột rồi lấy `td` theo chỉ số.

```js
const ORDER = ['使用場所','回路名','制御器具番号','製造者','型式','製造番号','製造年'];
(() => { const b = window.__blk[0];
  const th = [...b.querySelectorAll('th')].find(e => e.innerText.trim().replace(/\s+/g,'') === '<NHÃN>');
  if (!th) return 'NOTFOUND-th';
  th.scrollIntoView({ block: 'center' });
  const dataRow = [...b.querySelectorAll('tr')].find(r => r.querySelectorAll('td').length >= ORDER.length);
  const td = dataRow.querySelectorAll('td')[ORDER.indexOf('<NHÃN>')];
  return [window.__mark(th, 'nhãn'), window.__mark(td, 'giá trị = ' + td.innerText.trim())].join(','); })()
```

Giá trị đã verify trên inspection `990017030` (plan `990018030`), khối `登録1`:
`使用場所` = 主電気室 · `回路名` = 67 · `制御器具番号` = `-` (dùng làm case No-data) · `製造者` = 三菱電機 ·
`型式` = MP11A-AR · `製造番号` = 8080 · `製造年` = 2026年07月.

### 9.3 Field `特性` nằm ở bảng con thứ hai

Không có trong `__blk[0]`. Tra trong `__blk[1]`, giá trị nhận diện bằng mẫu chữ thay vì vị trí:

```js
(() => { const b = window.__blk[1];
  const th = [...b.querySelectorAll('th')].find(e => e.innerText.trim().replace(/\s+/g,'') === '特性');
  const td = [...b.querySelectorAll('td')].find(e => /限時|瞬時|定限時/.test(e.innerText));
  th.scrollIntoView({ block: 'center' });
  return [window.__mark(th,'nhãn'), window.__mark(td,'set_characteristic = ' + td.innerText.trim())].join(','); })()
```

Verify: `特性` = `強反限時(VI)` (登録1) · `反限時(NI)` (登録2).

### 9.4 Nhóm ② có nhiều khối `登録N` và nhiều loại thử nghiệm

Trên inspection `990017030` có: `過電流継電器試験(OCR)/登録1`, `/登録2`, `地絡方向継電器試験/登録1`,
`/登録2`, `逆電力継電器試験(RPR/67P)/登録1`. Trên `990017070` thì khác: OCR có `登録1..3`, thêm
`不足電圧継電器試験(UVR/27)/登録1` và `過電圧継電器試験(OVR/59)/登録1`. **Luôn tra danh sách tiêu đề thật
trước khi chụp**, đừng giả định khối nào tồn tại:

```js
[...document.querySelectorAll('p.title')].filter(e => /^◆/.test(e.innerText.trim())).map(e => e.innerText.trim())
```

Các bảng 地絡方向 / UVR / OVR / RPR có thêm cột (`電流(A)`, `電圧(%)`, `時間(s)`, `最小動作電流(A)`,
`動作時間(ms)`, `位相特性`…) nhưng vẫn theo đúng mẫu "th ngang + td hàng dưới" của §9.2 — chỉ cần đổi
mảng `ORDER` cho khớp header của bảng đó.
