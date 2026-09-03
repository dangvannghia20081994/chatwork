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

### 9.5 Bảng OCR `__blk[1]` — bản đồ ô theo chỉ số (verify TC 790–807, 2026-08-27)

Đo trên inspection `990017030`, khối `◆過電流継電器試験(OCR)/登録1`. `rs = [...__blk[1].querySelectorAll('tr')]`:

| Ô                                | Truy cập                                                  | Giá trị đo được |
|----------------------------------|-----------------------------------------------------------|-----------------|
| `inst_element_type`              | `rs[0].children[4]` (th `瞬時要素(連動)`, colspan 2)          | 連動 (type = 1)   |
| `inst_setting_label_a`           | `rs[1].children[7]`                                       | 整定A            |
| `inst_setting_label_ms`          | `rs[1].children[8]`                                       | 80              |
| `chk_decision` (nhãn)            | `rs[0].children[5]` (th `判定`, rowspan 2)                  | 判定              |
| `inst_pickup_current_r`          | hàng R: `[...rs[2].children].filter(TD)[8]`               | 9               |
| `inst_op_time_ms_r`              | hàng R: `…filter(TD)[9]`                                  | 98              |
| `chk_decision` (giá trị)         | hàng R: `…filter(TD)[10]`                                 | ◯ (enum 2)      |
| `inst_pickup_current_t`          | hàng T: `[...rs[3].children].filter(TD)[7]`               | 9               |
| `inst_op_time_ms_t`              | hàng T: `…filter(TD)[8]`                                  | 98              |
| `remarks` nhãn / giá trị         | `__blk[2].querySelector('th')` / `…('td')`                | 備考 / `-`        |

Hàng R và hàng T **lệch nhau 1 chỉ số TD**: hàng R có thêm `td` 特性 (rowspan 2) và `td` 判定 (rowspan 2),
hàng T không có. Ô `相` (R/T) là `<th>` nằm giữa hàng nên phải `filter(c => c.tagName === 'TD')` trước
khi lấy theo chỉ số, đừng dùng `querySelectorAll('td')` rồi đếm theo header.

Nhãn cột `始動電流(A)` / `動作時間(ms)` chỉ hiện khi `inst_setting_label_a` / `inst_setting_label_ms`
rỗng — bản ghi này có label nên UI hiện `整定A` / `80`. TC "Item type" của `inst_pickup_current_*`
soi đúng ô th đó, không có ô nhãn riêng cho pha T (khoanh thêm ô `相 T` để phân biệt R/T).

### 9.6 Bảng DGR `◆地絡方向継電器試験/登録1` (verify TC 808–809, 2026-08-27)

Cùng công thức gom sibling ở §9.1 → 3 bảng, tổng cao ~185px, lọt khung 744×1133 sau
`__dt.scrollIntoView({block:'start'})`. Header có **38 `<th>`** trên cả 3 bảng:
`使用場所 · 継電器仕様(回路名/制御器具番号/整定値[電流(A)/電圧(%)/時間(s)]/製造者/型式/製造番号/製造年)` ·
`最小動作電流(A)[0.1/0.2/0.4/0.8/1.0 A] · 動作時間(ms)[0.1..0.4 s × 130%/400%] · 位相特性[進み(度)/遅れ(度)] ·
慣性特性試験 · 試験釦 · 判定` · `備考`. TC "Item type（各field）" = mark cả 38 th, **không kèm note**
(banner che mất chữ trong ô hẹp).

### 9.7 Hai cạm bẫy khi chụp cụm TC bằng `--keep` (2026-08-27)

| Hiện tượng                                                                 | Nguyên nhân                                                                                             | Cách xử lý                                                                                        |
|----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| `__mark` trả `marked` nhưng ảnh không có viền, `shot-check` báo `NO-RED`   | Lệnh trước đã `scrollIntoView` sang khối khác; phần tử cache trong `window.__e` nằm ngoài viewport, `__mark` dùng `position:fixed` nên viền vẽ ngoài khung ảnh | `scrollIntoView` lại khối đang chụp **ngay trong lệnh** trước khi mark; `__mark` không tự kiểm phần tử ngoài viewport |
| Ô nhỏ (70×26) → `shot-check` báo `OK +WEAK` (red ≈ 680–795, ngưỡng 800)     | Chu vi viền 3px của ô cỡ đó chỉ ~700 pixel đỏ                                                            | Tăng viền lên 6px cho phần tử `width < 120 \|\| height < 40` → red ≈ 1.100–1.400, hết cờ `WEAK`     |

### 9.8 Bảng DGR / UVR / OVR — vị trí ô dữ liệu (verify TC 810–829, 2026-08-27)

Cả 3 loại đều theo mẫu 3 bảng của §9.1. Lấy hàng dữ liệu bằng
`[...tbl.querySelectorAll('tr')].map(r => [...r.children].filter(c => c.tagName === 'TD')).filter(x => x.length).pop()`
(hàng cuối có `td`), rồi đếm theo chỉ số:

| Bảng                  | `blk[0]` (継電器仕様) — thứ tự `td`                                                       | `blk[1]` (試験結果) — `td` cần dùng                                              | `blk[2]` |
|-----------------------|-------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|----------|
| DGR (`地絡方向`)        | 0 使用場所 · 1 回路名 · 2 制御器具番号 · 3 電流(A) · 4 電圧(%) · 5 時間(s) · 6 製造者 · 7 型式 · 8 製造番号 · 9 製造年 | 0–4 最小動作電流 · 5–12 動作時間 · 13 進み · 14 遅れ · **15 慣性特性試験 · 16 試験釦 · 17 判定** | 備考      |
| UVR / OVR             | 0 使用場所 · 1 回路名 · 2 制御器具番号 · 3 電圧(V) · 4 時限(s) · 5 製造者 · 6 型式 · 7 製造番号 · 8 製造年       | 0–1 動作電圧 · 2–3 復帰電圧 · 4–7 動作時間 · **8 試験釦 · 9 判定**                      | 備考      |

UVR/OVR có **26 `<th>`** trên cả khối (dùng cho TC "Item type（各field）"), DGR có 38. Nhãn phụ khi
`*_label_2..4` = null hiển thị **chỉ đơn vị** (`V` / `s`), KHÔNG ra `-` → khối UVR của inspection
`990017070` không có ô nào ra `-`, không dùng làm evidence cho TC "No data (blank/null)".

Bản ghi đã verify (2026-08-27): DGR `990017030` id 7 → `controller_no` null ⇒ ô `-`, 試験釦 `△`,
判定 `◯`, 製造年 `2026年07月` · UVR `990017070` id 1 → đủ giá trị, 試験釦/判定 đều `△`, 備考 `454` ·
OVR `990017070` id 1 → 判定 `✕`, 備考 2 dòng `999.99` · OVR `990017110` id 3 → `controller_no` null
⇒ ô `-` (dùng cho TC No-data của OVR).

### 9.9 Lịch 予定 không render event (2026-08-27)

Đường đi §5.2 hiện **không dùng được**: mở tab `予定` tháng 2026/08 ra 42 ô ngày nhưng
`.calendar-item__name` = 0 và click ô ngày 10 mở modal cũng `.timeline__event-name` = 0, dù
`plan_assignment` có `eid` = 4 cho plan `990018082` (state 13, `work_start` 2026-08-09T17:00Z).
Sau khi vào lịch rồi quay lại Home, các tab `点検計画未確定` / `本日の予定` cũng render rỗng (phải
`--renav`). Hệ quả: plan state 13 hiện chưa mở được từ app mobile → TC cần bản ghi của plan đó phải
để trống cột M kèm lý do ở cột N (đã áp dụng cho TC 821).

### 9.10 Bảng RPR `◆逆電力継電器試験(RPR/67P)/登録1` (verify TC 848–855, 2026-08-27)

Đo trên inspection `990017030` (plan `990018030`, state 11). Cùng mẫu 3 bảng của §9.1, tổng **30 `<th>`**
(dùng cho TC "Item type（各field）").

| Bảng     | `td` hàng dữ liệu (lấy bằng `__dtd`)                                                                                     |
|----------|---------------------------------------------------------------------------------------------------------------------------|
| `blk[0]` | 0 使用場所 · 1 回路名 · 2 制御器具番号 · 3 電力(%) · 4 時限(s) · 5 製造者 · 6 型式 · 7 製造番号 · 8 製造年                                    |
| `blk[1]` | 0–1 動作電力 · 2–3 復帰電力 · 4–7 動作時間 · 8 進み(°) · 9 遅れ(°) · 10 最大感度角 · **11 試験釦 · 12 判定**                             |
| `blk[2]` | 0 備考                                                                                                                     |

Bản ghi `inspection_relay_rpr` id 3 (`990017030`): `controller_no` null ⇒ ô `-` (TC No-data) ·
`製造年` = 2026年08月 · 進み/遅れ = 89/89 · 最大感度角 = 0 · `chk_test_button_status` null ⇒ 試験釦 = `-` ·
判定 = `◯` · `remarks` null ⇒ 備考 = `-`.

### 9.11 Bảng ◆接地抵抗測定 (renovation) — 1 bảng, không phải 3 (verify TC 864–873, 2026-08-27)

`__blkOf('◆接地抵抗測定')` trả **`blk=1`**. Bảng có 1 hàng `<th>` + N hàng `<td>`, cột theo thứ tự:
`0 使用場所 · 1 用途 · 2 種別 · 3 測定値(Ω) · 4 判定 · 5 備考`. Tra ô bằng
`rs = [...blk[0].querySelectorAll('tr')]` → `rs[0].children[i]` là nhãn, `rs[1+k].children[i]` là giá trị.

Trên `990017030` DB có 10 bản ghi nhưng UI **chỉ render 2 hàng** (id 89, 90 — 8 bản ghi còn lại mọi cột
null nên không hiện). Giá trị: 主電気室 / 高圧機器 / A / 8 / ◯ / `-` và 主電気室 / 高圧機器 / B / 54 / △ / `-`.
Ô 備考 = `-` dùng cho TC No-data.

### 9.12 Tìm plan trên Home — `.plan-title` là TIÊU ĐỀ, không phải plan id (2026-08-27)

§5.1 nói tìm `.plan-title` khớp `^<plan_id>`; thực tế trên 523 card của tab `点検報告未完了` **chỉ 1 card**
có id trong tiêu đề (`990018070: MINSP-002 new new / 改修後検査`) — id nằm trong tiêu đề là do người tạo
đặt tên như vậy. Cách đúng: lấy `plan.title` từ DB
(`SELECT id, title FROM rezil_esms_inspection.plan WHERE id = <plan_id>`) rồi khớp `innerText.includes(title)`,
và kiểm ngược `SELECT id FROM plan WHERE title = '<title>'` chỉ trả đúng 1 dòng trước khi click.

Lưu ý schema: `inspection` **không có** `plan_id`; liên kết ngược lại là `plan.inspection_id`.
`plan_assignment` dùng cột `eid` (không phải `engineer_id`). Các bảng relay con dùng khoá
`inspection_<loại>_setting_id` (ví dụ `inspection_ovgr_setting_id`), không phải `relay_<loại>_setting_id`
như SQL ghi trong cột Expected của sheet.

### 9.13 Cờ `EDGE` của shot-check thường do NOTE, không do viền (2026-08-27)

Ba lần `OK +EDGE` trong batch TC 830–873 đều là **banner note** (`position:absolute;left:0;top:-24px`)
của ô nằm phía phải bảng chạy quá mép 744px, không phải viền đỏ bị cắt. Cách xử lý: rút note còn
`ラベル` / `値` (bỏ giá trị dài như `値 2026年08月`) rồi chụp lại — red giảm nhẹ, hết cờ `EDGE`.

### 9.14 Nhóm ③ 測定 và ④ 耐圧試験 — mỗi bảng là 1 `<table>` (verify TC 874–893, 2026-08-27)

Khác nhóm ② (3 bảng rời, §9.1): `__blkOf` của các bảng dưới đều trả **`blk=1`**, tra ô bằng
`rs = [...window.__blk[0].querySelectorAll('tr')]` rồi `rs[i].children[j]`.

| Bảng (`p.title`)         | Hàng header      | Hàng dữ liệu | Thứ tự `children` của hàng dữ liệu                                                                             |
|--------------------------|------------------|--------------|-----------------------------------------------------------------------------------------------------------------|
| `◆高圧絶縁抵抗測定`           | `rs[0]` + `rs[1]` | `rs[2..4]`   | 0 使用場所 · 1 測定回路 · 2 回路電圧(V) · 3 測定電圧(V) · 4 R-E · 5 S-E · 6 T-E · 7 判定 · 8 備考                          |
| `◆低圧絶縁抵抗測定`           | `rs[0]`          | `rs[1..8]`   | 0 使用場所 · 1 回路名 · 2 回路電圧(V) · 3 定格電流(A) · 4 測定値(MΩ) · 5 判定 · 6 備考                                     |
| `◆高圧絶縁耐力試験(交流電圧)`    | `rs[0]` + `rs[1]` | `rs[2..19]`  | 1 bản ghi = **3 `tr`**: `rs[2+3k]` (0 使用場所 · 1 試験回路 · 2 試験前 · 3 試験後 · 4 試験電圧 · 5 `<th>`一次電圧(V) · 6–11 giá trị 1–10分 · 12 判定 · 13 備考), `rs[3+3k]` 一次電流(A), `rs[4+3k]` 二次電流(mA) |

`◆高圧絶縁抵抗測定` header có 2 hàng vì `大地間(GΩ)` tách tiếp thành `R-E / S-E / T-E` → TC
"Item type（各field）" phải khoanh cả `rs[0]` lẫn `rs[1]`.

Dữ liệu đã verify trên inspection `990017030` (plan `990018030`, `yenltb test INSP003`, state 11):
高圧絶縁抵抗 3 hàng (判定 đều `◯`, 備考 đều `-`) · 低圧絶縁抵抗 8 hàng (判定 đều `◯`, 備考 đều `-`) ·
耐圧試験(交流) 6 bản ghi, bản ghi thứ 6 (`id` 42) mọi cột trừ `ac_primary_v_*` đều null ⇒ hiện `-`
→ dùng cho TC No-data. Ba bảng này đều nằm trên **cùng một màn** với `◆接地抵抗測定` (§9.11), nên
TC 864–893 dựng flow đúng 1 lần.

### 9.15 Lockfile `--keep` có `profile` rỗng thì phiên đó vô dụng (2026-08-27)

`ui-next/.chrome-profiles/.keep-mob011b.json` còn sống nhưng `"profile": ""` → attach vào thì mọi
request trả `ERR_BLOCKED_BY_CLIENT`, `--renav` ra `chrome-error://chromewebdata/`. Xử lý: `--keep-stop`
rồi mở lại có đủ `--login rezil --profile mob011-b --chrome-flag …`. Kiểm nhanh trước khi attach:
`cat ui-next/.chrome-profiles/.keep-<tag>.json` — `profile` rỗng thì đóng luôn, đừng dò tiếp.

### 9.16 Bảng ◆高圧絶縁耐力試験(交流電圧) — bản đồ ô đã đo lại (verify TC 914–933, 2026-08-27)

`__blkOf('◆高圧絶縁耐力試験(交流電圧)')` → `blk=1`, `rs = [...__blk[0].querySelectorAll('tr')]` có **20 hàng**
(6 bản ghi × 3 hàng + 2 hàng header). Bản đồ chi tiết hơn §9.14 (§9.14 ghi giá trị ở `children[6..11]`
của hàng 一次電圧 là đúng, nhưng thiếu chỉ số của 2 hàng còn lại và của header):

| Hàng          | `children`                                                                                                                                  |
|---------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| `rs[0]` header | 0 使用場所 · 1 試験回路(印加範囲) · 2 絶縁抵抗測定(GΩ) · 3 試験電圧(V) · 4 (trống) · **5 = 1分 · 6 = 3分 · 7 = 5分 · 8 = 7分 · 9 = 9分 · 10 = 10分** · 11 判定 · 12 備考 |
| `rs[1]` header | 0 試験前 · 1 試験後 (tách tiếp của 絶縁抵抗測定(GΩ))                                                                                                    |
| `rs[2+3k]` 一次電圧(V) | 0 使用場所 · 1 試験回路 · 2 試験前 · 3 試験後 · 4 試験電圧 · **5 = `<th>`一次電圧(V) · 6..11 = ac_primary_v_1min…10min** · 12 判定 · 13 備考                      |
| `rs[3+3k]` 一次電流(A) | **0 = `<th>`一次電流(A) · 1..6 = ac_primary_a_1min…10min**                                                                                    |
| `rs[4+3k]` 二次電流(mA) | **0 = `<th>`二次電流(mA) · 1..6 = ac_secondary_ma_1min…10min**                                                                              |

Hai hàng 一次電流/二次電流 **không có ô nhãn riêng theo cột** — dùng chung header 1分…10分 của `rs[0]`.
Đó là lý do cột D của sheet ghi nhãn các field này là `ー`. TC "Item type" của các field đó chụp bằng
cách khoanh **2 ô**: `<th>` nhãn hàng (`rs[3|4].children[0]`) + ô header cột tương ứng (`rs[0].children[5..10]`);
TC "Data value" khoanh **1 ô** giá trị.

Kiểm chéo DB (không có cột `inspection_id` — phải join qua setting):

```sql
SELECT w.* FROM inspection_withstand_voltage_ac w
JOIN inspection_withstand_voltage_ac_setting s ON w.withstand_voltage_ac_setting_id = s.id
WHERE s.inspection_id = 990017030 ORDER BY w.id ASC;
```

Bản ghi đầu (`id` 36) trên `990017030`: `a_1..a_10min` = 9/9/9/9/9/90 · `ma_1..ma_5min` = 9/9/97 —
khớp đúng UI, dùng để xác nhận mapping chỉ số cột.

### 9.17 Khoanh 1 ô bảng nhỏ luôn bị cờ `WEAK` — dùng viền 6px (2026-08-27)

`shot-check.mjs:120` gắn `WEAK` khi `red < 800`. Ô dữ liệu trong bảng 耐圧試験 rộng ~35×25px, viền 3px
chỉ cho red ≈ 580–640 → 11/20 ảnh batch TC 914–933 bị `WEAK` dù khoanh đúng ô. Cách xử lý: sau khi
`__mark`, nâng độ dày viền lên 6px — red lên ≈ 920–1040, hết cờ, vị trí khoanh không đổi.

```js
window.__mt = (tc, pairs) => { const r = window.__m(tc, pairs);
  document.querySelectorAll('.__mark').forEach(d => { d.style.borderWidth = '6px' }); return r };
```

Ảnh khoanh 2 ô (nhãn hàng + header cột) không cần việc này — red ≈ 1240 với viền 3px.

### 9.18 `ERR_BLOCKED_BY_CLIENT` không chỉ do `profile` rỗng (2026-08-27)

Bổ sung §9.15: lockfile `.keep-probe.json` có `profile` trỏ đúng thư mục
(`ui-next/.chrome-profiles/probe`) và `openedFor` đúng origin, nhưng attach vào vẫn
`GET / → ERR_BLOCKED_BY_CLIENT`, `location.href = chrome-error://chromewebdata/`. Nên đừng dựa vào
mỗi trường `profile` để phán phiên còn dùng được: attach xong chạy
`--eval "location.href"` một lần, ra `chrome-error://` thì `--keep-stop` rồi mở phiên mới.

### 9.19 Bảng ◆高圧絶縁耐力試験(直流電圧) — cùng khung với bảng AC (verify TC 944–949, 2026-08-27)

`__blkOf('◆高圧絶縁耐力試験(直流電圧)')` → `blk=1`, `rs` có **3 hàng** (1 bản ghi trên `990017030`):

| Hàng    | `children`                                                                                                                                       |
|---------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| `rs[0]` | 0 使用場所 · 1 試験回路(印加範囲) · 2 絶縁抵抗測定(GΩ) · 3 試験電圧(V) · 4 (trống) · 5 = 1分 … 10 = 10分 · 11 判定 · 12 備考                                          |
| `rs[1]` | 0 試験前 · 1 試験後                                                                                                                                  |
| `rs[2]` | 0 使用場所 · 1 試験回路 · 2 試験前 · 3 試験後 · 4 試験電圧 · **5 = `<th>`漏れ電流(μA) · 6..11 = leakage_ua_1min…10min** · 12 判定 · 13 備考                        |

Header giống hệt bảng AC (§9.16); khác ở chỗ hàng dữ liệu chỉ có **1 hàng/bản ghi** (AC có 3) và ô
`<th>` cột 5 là `漏れ電流(μA)`. Query kiểm chéo cũng phải join qua setting:
`inspection_withstand_voltage_dc` JOIN `inspection_withstand_voltage_dc_setting s ON …setting_id = s.id
WHERE s.inspection_id = <id>`.

Trên env 207 (2026-08-27): 5 bản ghi DC toàn env, 1 bản ghi thuộc `990017030`. **`remarks` của cả
`inspection_withstand_voltage_ac` và `…_dc` rỗng ở toàn env** (0 bản ghi có giá trị) → TC yêu cầu
pre-condition "備考にデータが存在する" không dựng được, phải treo và ghi cột N.

Đếm lại 2026-08-27 tối: AC 13 bản ghi / 0 có `remarks`, DC 5 bản ghi / 0 có `remarks` — không đổi.
TC 943 (備考 của bảng AC) đã ghi lý do vào `N1017`.

### 9.20 Đường vào Preview (判定基準一覧, MOB-012 §3.3) — verify TC 950/952, 2026-08-27

Bảng `判定基準一覧` **không** có ở màn báo cáo mode Edit/Confirm/View (kiểm: `p.title` khớp `判定基準`
trả rỗng ở mode Confirm). Đường vào:

1. Ở màn báo cáo mode Edit bấm `点検項目を修正` → mở màn 点検内容 (`InspectionContent.svelte`), chờ ~9s.
2. Bấm FAB preview `.content__preview-fab` (`InspectionContent.svelte:1194`), chờ ~8s.
3. Preview mở với tiêu đề `点検報告プレビュー`; `判定基準一覧` nằm cuối phần 耐圧試験.

Mode Confirm chỉ có 2 nút (`キャンセル`, `報告書を提出する`) nên phải `キャンセル` về Edit trước —
`キャンセル` ở mode Confirm chỉ đổi hiển thị, không ghi dữ liệu.

**`RenovationCriteriaList.svelte` là bảng tham chiếu cố định**: 392 dòng, không nhận props, không đọc
`inspection_relay_general`, 4 cột `試験項目 / サブ項目 / 判定基準 / 備考`, và **không có field `使用場所`
hay `judgment_criteria_1..4`**. Hệ quả cho sheet: TC 951 (Get data SQL từ `inspection_relay_general`),
TC 953–962 (使用場所, 判定基準1..4) không có phần tử nào để khoanh → treo, ghi lý do cột N và báo người
phụ trách xác nhận lại Expected.

Đường dẫn đúng của component (2026-08-27 tối): `rezil-esms-mobile/app/src/features/inspection-report/
components/renovation/RenovationCriteriaList.svelte` — **không** nằm dưới `features/execution/`.
Gọi ở `features/inspection-report/pages/InspectionReport.svelte:687` và `:745`, cả hai đều
`<RenovationCriteriaList />` không truyền props. Header thật của bảng: `<th colspan="2">試験項目</th>`
· `判定基準` · `備考` (dòng 210–212). Cột `judgment_criteria_1..4` **có** trong DB và API **có** trả
(`rezil-esms/be-api/app/model/writes/report/RenovationReportDetail.scala:1135–1138`), nhưng phía UI
chỉ xuất hiện trong file type defs `lib/api/defs/@types/index.ts` — không component `.svelte` nào
render. Đây là lệch Expected ↔ implement, không phải lỗi selector.
Lý do đã ghi: `N1027` (TC 951) và `N1029` (TC 953–962). TC 950 (điều kiện hiển thị Preview) và TC 952 (title) chụp được vì
bảng luôn render ở Preview.

### 9.21 Bảng OCR — bản đồ đầy đủ 3 bảng con (verify TC 730–749, 2026-08-27)

Bổ sung §9.5 (chỉ có nhóm `inst_*`). Đo trên inspection `990017030`, khối `◆過電流継電器試験(OCR)/登録1`
(`inspection_relay_ocr` id 6). `a = __rs(0)`, `b = __rs(1)`; nguồn markup
`RenovationOcrTable.svelte:80-140`.

| Hàng      | `children`                                                                                                                       |
|-----------|----------------------------------------------------------------------------------------------------------------------------------|
| `a[0]`    | 0 使用場所 · 1 継電器仕様 (colspan 6)                                                                                              |
| `a[1]`    | 0 回路名 · 1 制御器具番号 · 2 製造者 · 3 型式 · **4 製造番号 · 5 製造年**                                                            |
| `a[2]`    | 0 主電気室 · 1 67 · 2 `-` · 3 三菱電機 · 4 MP11A-AR · **5 8080 · 6 2026年07月**                                                     |
| `b[0]`    | **0 整定値 (colspan 3)** · 1 特性 (rowspan 2) · **2 相 (rowspan 2)** · 3 限時要素(連動) (colspan 4) · 4 瞬時要素(連動) · 5 判定       |
| `b[1]`    | **0 限時(A) · 1 瞬時(A) · 2 時限(L)** · 3 整定L300% · 4 整定L700% · 5 レバー10 300% · 6 レバー10 700% · 7 整定A · 8 80              |
| `b[2]` (R) | **0 set_time_a_r · 1 set_instantaneous_a_r · 2 set_time_l_r** · 3 特性 (rowspan 2) · **4 `<th>` R** · 5–8 timed val R · 9–10 inst R · 11 判定 |
| `b[3]` (T) | **0 set_time_a_t · 1 set_instantaneous_a_t · 2 set_time_l_t** · **3 `<th>` T** · 4–7 timed val T · 8–9 inst T                     |

Lưu ý khi đếm: `a[1]`/`b[1]` là hàng header thứ hai nên chỉ số **lệch** so với hàng dữ liệu
(`使用場所` ở `a[0]`, `a[2].children[0]`). Hàng R có thêm `td` 特性 và `td` 判定 (đều rowspan 2) nên
lệch 1–2 chỉ số so với hàng T — dùng `children` (không filter TD) thì phải nhớ `相` là `<th>` giữa hàng.

Quy ước chụp đã dùng cho TC 730–749:

| Loại TC (cột D/E của sheet)                       | Ô khoanh                                                                 |
|---------------------------------------------------|--------------------------------------------------------------------------|
| `<field>_r` Item type (có nhãn riêng)              | ô `<th>` ở `b[1]`                                                        |
| `<field>_r` Data value                             | ô `<td>` tương ứng ở `b[2]`                                              |
| `<field>_t` Item type — cột D ghi nhãn là `ー`      | 2 ô: `<th>` nhãn cột ở `b[1]` (dùng chung với pha R) + ô `相 T` `b[3][3]` |
| `<field>_t` Data value                             | ô `<td>` tương ứng ở `b[3]`                                              |
| `相` Item type / Data value (Expected `相 が表示される`) | cùng 1 ô `b[0].children[2]`, chụp 2 file theo 2 số TC                    |

`phase_setting_value` (cột D `(整定値)`) **không có cột trong `inspection_relay_ocr`** — đó là header
nhóm 3 cột 限時(A)/瞬時(A)/時限(L), không có ô giá trị riêng. Expected của TC "Data value" ghi `ー`
hiểu là "không có giá trị trực tiếp"; TC 735 chụp chính ô `整定値` kèm note `値なし`. Tương tự
`phase_r` / `phase_t` là nhãn cố định (`O('phase_r')`), không phải field DB.

### 9.22 `--no-shot` chặn cả step `shot:` (2026-08-27)

`debug.mjs:139` đặt `wantShot = !has("no-shot")` và `shoot()` return sớm ở `:765` — nên
`--no-shot` **không** chỉ bỏ ảnh cuối lệnh, nó bỏ luôn mọi `--step shot:<nhãn>`. Lệnh chạy xong báo
`marked` đủ số TC nhưng `.snapshots/` không có file mới. Chỉ dùng `--no-shot` cho lệnh dò selector.

### 9.23 Nhóm 限時要素 của bảng OCR — 1 ô header gánh 2 field (verify TC 750–769, 2026-08-27)

`timedLabel(label, pct)` (`RenovationOcrTable.svelte:34`) ghép **2 field vào 1 ô `<th>`**:
`"<timed_setting_label_l> <timed_op_time_pct_1>%"` → `b[1].children[3]` = `整定L 300%`,
`b[1].children[4]` = `整定L 700%`. Hệ quả: 4 TC (`timed_setting_label_l` Item type/Data value +
`timed_op_time_pct_1` Item type/Data value) đều soi **cùng một ô** — chụp 4 file theo 4 số TC.
Tương tự cho cặp `timed_setting_label_l_2` / `timed_op_time_pct_2` ở `children[4]`.

`elementLabel(base, type)` (`:31`) cũng ghép: `b[0].children[3]` = `限時要素(連動)` mang cả nhãn nhóm
lẫn giá trị `timed_element_type` (1 ⇒ `連動`, 2 ⇒ `単体`) → TC 754 (Item type, nhãn `ー`) và TC 755
(Data value) dùng cùng ô này.

**Không có ô nào hiển thị chữ `ms` trong nhóm 限時要素.** Khác nhóm 瞬時要素 (`:104-105` có fallback
`show(rec.instSettingLabelA) || O('inst_pickup_a')` → `始動電流(A)` / `動作時間(ms)` khi label rỗng),
`timedLabel` không có fallback: label rỗng thì ô ra `-` hoặc `- 300%`, không bao giờ ra `ms`. Vì vậy
Expected `テキストはms` của TC 760/768 (và các TC `timed_op_time_*_r (ms)` sau) không có phần tử nào
khớp đúng chữ — đã chụp ô header cột tương ứng (`b[1].children[3|4]`) kèm ô `相 R` để phân biệt pha,
và cần người viết TC xác nhận lại Expected.

Ô `相` R/T là `<th>` nằm giữa hàng dữ liệu: `b[2].children[4]` (R) và `b[3].children[3]` (T) — dùng cho
cả TC Item type (nhãn `R`/`T`) và TC Data value (`phase_r`/`phase_t` là nhãn cố định `O('phase_r')`,
không phải cột DB).

### 9.24 Nhóm レバー10 và 瞬時要素 của bảng OCR (verify TC 770–789, 2026-08-27)

Dump thật của `__rs(1)` trên inspection `990017030` (khối `◆過電流継電器試験(OCR)/登録1`,
`inspection_relay_ocr` id 6) — dùng thay cho việc đếm lại theo markup:

```
0: TH整定値 TH特性 TH相 TH限時要素(連動) TH瞬時要素(連動) TH判定
1: TH限時(A) TH瞬時(A) TH時限(L) TH整定L 300% TH整定L 700% TH レバー10 300% TH レバー10 700% TH整定A TH80
2: TD80 TD80 TD80 TD強反限時(VI) THR TD0 TD8 TD98 TD89 TD9 TD98 TD◯
3: TD80 TD8 TD8 THT TD98 TD98 TD980 TD89 TD9 TD98
```

Mapping đã dùng cho TC 770–789 (4 cột 限時要素 = `b[1].children[3..6]`, giá trị R ở `b[2][5..8]`,
giá trị T ở `b[3][4..7]`):

| Field                          | Header (Item type)                 | Giá trị R      | Giá trị T       |
|--------------------------------|------------------------------------|----------------|-----------------|
| `timed_op_time_val_1_*`        | `b[1][3]` 整定L 300%                | `b[2][5]` = 0  | `b[3][4]` = 98  |
| `timed_op_time_val_2_*`        | `b[1][4]` 整定L 700%                | `b[2][6]` = 8  | `b[3][5]` = 98  |
| `timed_op_time_level_val_1_*`  | `b[1][5]` レバー10 300%             | `b[2][7]` = 98 | `b[3][6]` = 980 |
| `timed_op_time_level_val_2_*`  | `b[1][6]` レバー10 700%             | `b[2][8]` = 89 | `b[3][7]` = 89  |

`timed_setting_label_level` / `timed_op_time_pct_level_1` ghép trong **cùng** ô `b[1][5]`
(`レバー10 300%`), `timed_setting_label_level_2` / `timed_op_time_pct_level_2` trong `b[1][6]`
(`レバー10 700%`) — cùng cơ chế `timedLabel()` đã nêu ở §9.23, nên 4 TC dùng chung 1 ô, chụp 4 file.

`instantaneous_element_setting` (TC 788/789) **không phải cột DB** — bảng `inspection_relay_ocr`
chỉ có `inst_element_type` / `inst_setting_label_a` / `inst_setting_label_ms`. Ô tương ứng là header
nhóm `b[0][4]` = `瞬時要素(連動)` do `elementLabel(O('inst_element'), rec.instElementType)` render
(`inst_element_type` = 1 ⇒ `連動`, 2 ⇒ `単体`) — cùng cách xử lý như TC 754/755 của nhóm 限時要素.

Ô `b[0][4]` nằm sát mép phải bảng: khoanh **kèm note** thì banner tràn ra ngoài 744px →
`shot-check` báo `OK +EDGE` (box tới x = 742–743). Khoanh **không note** (1 phần tử, đúng convention
§4 của EVIDENCE_REFERENCE) thì box còn (525,42)-(671,192), red = 2060, hết cờ.

### 9.25 判定基準一覧: chụp TC "hàng cố định" + mốc dòng của sheet (verify TC 954–963, 2026-08-27)

**Mốc dòng sheet (đã sai 1 lần trong lượt này):** offset `row = TC + 61` chỉ đúng tới TC 949.
Dòng section `S04_3.3 判定基準一覧` chèn ở row 1025, nên từ TC 950 offset thành `row = TC + 76`:
row 1026 = TC 950 … **row 1029 = TC 953, row 1030 = TC 954, row 1039 = TC 963**. Trước khi ghi phải
đọc cột C của đúng dải row và đối chiếu — offset không suy được từ dải trước.

`sheetId` của tab = **441162473** (lấy bằng `get_sheet_data` range `A1:A1` + `include_grid_data`,
trả `sheets.properties.sheetId`); cần cho `updateCells` khi ghi ô rich text nhiều link.

Bảng `判定基準一覧` ở Preview: 1 `<table>` **664×1534**, 24 `tr` trong `tbody` — **cao hơn viewport
1133** nên TC 963 (`他の行はdesignどおりに固定表示される`) phải chụp 2 ảnh `_1` / `_2`, cột M ghi
rich text 2 dòng (2 `textFormatRuns`).

Cách khoanh: gom union rect của các hàng lọt hẳn trong viewport rồi vẽ 1 khung, thay vì khoanh cả
`<table>` (element cao 1534 → viền trên/dưới vẽ ngoài khung ảnh). Hàng cuối (`rows[23]`, cao 343px)
có `bottom` = **đúng 1133** = `innerHeight` sau `scrollIntoView({block:'end'})` → điều kiện
`bottom <= innerHeight - 8` loại nó ra; phải kẹp `y2 = min(y2, innerHeight - 10)` mới khoanh được
hàng cuối mà không bị cờ `EDGE`. Kết quả: `_1` red 15260, `_2` red 12059, cả hai `OK`.

### 9.26 Đường vào report của plan state 13: 事業場 → 点検履歴 (verify TC 821/840–847, 2026-08-27)

§9.9 kết luận plan `990018082` (state 13) không mở được từ app mobile — **kết luận đó sai**, chỉ
đường lịch 予定 là không dùng được. Đường dùng được:

1. `ion-tab-button` chứa `事業場` → danh sách 事業場 (mặc định lọc `担当する事業場のみ`).
2. Nút `詳細` của site cần mở (Site_new `S040121` là dòng đầu) → màn chi tiết site.
3. Tab `点検履歴` (là `div`/`span` lá, không phải `button` — tìm bằng `e.children.length === 0`).
   Lần đầu render rỗng, chờ thêm ~3s là ra danh sách.
4. Mỗi mục có nút `報告書確認` → mở MOB-011 mode View của inspection đó, **không phụ thuộc `plan.state`**.
   Danh sách trên Site_new có 83 nút; lọc theo text tổ tiên (`b.parentElement×3`) để tìm đúng mục
   (loại 点検 + ngày hiển thị theo JST), rồi xác nhận bằng request `GET /api/v1/report-summary/inspection/<inspection_id>`.

Đường này mở được mọi report của site, kể cả state 12/13 — dùng thay cho tab `点検報告未完了` (chỉ state 11/12).

### 9.27 Bảng LGR `◆低圧漏電継電器試験(LGR)/登録1` và UVR trên inspection 990017082 (verify TC 821, 840–847)

Cùng mẫu 3 bảng của §9.1 (`blk=3`). Dump thật (`__dump()`), inspection `990017082` (plan `990018082`,
site `Site_new` 40121, `category` = 21):

| Bảng     | Hàng                                                                                                           |
|----------|-----------------------------------------------------------------------------------------------------------------|
| `blk[0]` | `r0` 使用場所 · 継電器仕様 → `r1` 回路名 · 制御器具番号 · 整定値 · 製造者 · 型式 · 製造番号 · 製造年 → `r2` 電流(mA) · 時限(s) → **`r3` dữ liệu**: 0 主電気室 · 1 ưee · 2 `-` · 3 22 · 4 `-` · 5 戸上電機製作所 · 6 ê · 7 ê · 8 2026年08月 |
| `blk[1]` | `r0` 試験結果 → `r1` 動作電流(mA) · 試験釦 · 判定 → `r2` nhãn phụ (`33mA` + 5 ô `mA`) → **`r3`**: 0–5 giá trị 動作電流 (200, `-`×5) · **6 試験釦 = `-` · 7 判定 = ◯** |
| `blk[2]` | `r0`: 0 nhãn 備考 · 1 giá trị (`-`)                                                                              |

Đối chiếu DB (`inspection_relay_lgr` id 1, `inspection_lgr_setting_id` = 1): `controller_no` null ⇒ `-` ·
`chk_decision` = 2 ⇒ `◯` · `remarks` null ⇒ `-`. LGR **chỉ có 1 bản ghi trên toàn env 207**, nằm đúng
trên inspection này.

Bảng UVR của cùng report (dùng cho TC 821 "No data"): `blk[0].r3` = 主電気室 · 555 · **`-`** · 52 · 55 ·
ｵﾑﾛﾝ · K2ZC-K2RV-NPC · 55 · 2025年08月; `blk[1].r3` = 5 · `-` · 5 · `-` · 5 · `-` · `-` · `-` ·
**8 試験釦 = `-` · 9 判定 = ✕**; `blk[2]` 備考 = `-`. (Bản ghi `inspection_relay_uvr` id 2 — khác bản ghi
id 1 của `990017070` vốn không có ô `-` nào, xem §9.8.)

### 9.28 Định nghĩa các helper `__blkOf` / `__rs` / `__dump` (2026-08-27)

Các mục §9.x tham chiếu helper nhưng chưa ghi định nghĩa. Inject 1 lần mỗi phiên (sau `__mark` của
`EVIDENCE_REFERENCE.md` §4; bản `__mark` dùng ở đây nhận **cả element lẫn selector**):

```js
window.__blkOf = t => { const p = [...document.querySelectorAll('p.title')].find(e => e.innerText.includes(t));
  if (!p) return 'NOTFOUND'; const out = []; let n = p.nextElementSibling;
  while (n) { if (n.matches && n.matches('p.title')) break;
              if (n.querySelector && n.querySelector('p.title')) break; out.push(n); n = n.nextElementSibling }
  window.__blk = out; window.__ttl = p; return 'blk=' + out.length };
window.__rs   = i => [...window.__blk[i].querySelectorAll('tr')];
window.__dump = () => window.__blk.map((b, bi) => bi + '> ' + [...b.querySelectorAll('tr')]
  .map((r, ri) => ri + ':' + [...r.children].map(c => c.tagName[0] + c.innerText.replace(/\s+/g, '')).join(' ')).join(' | ')).join('  ##  ');
window.__mt   = () => { document.querySelectorAll('.__mark').forEach(d => { d.style.borderWidth = '6px' }); return 'thick' };
```

`__dump()` trả toàn bộ khối dưới dạng 1 dòng text — đủ để lập bản đồ ô mà không phải mở ảnh.

### 9.29 Trạng thái cột M của tab MOB-011 sau khi quét toàn bộ (2026-08-27)

Quét `M13:M1040` đối chiếu cột C: tab còn **46 TC trống** (con số 490 đo 2026-08-26 đã lỗi thời):
480 · 569–575 · 606 · 821 · 832–847 · 856–863 · 943 · 951 · 953–962. Batch 2026-08-27 chiều ghi
606 · 821 · 840–847 (10 ô) → còn **36 TC**. Phần lớn phần còn lại bị chặn vì dữ liệu, không phải selector:

| TC        | Lý do treo                                                                                         |
|-----------|-----------------------------------------------------------------------------------------------------|
| 480       | Cần mô phỏng submit thất bại (toast E-MSG-004) — chưa làm                                            |
| 569–574   | ĐÃ CHỤP 2026-08-27 bằng submit thật report `589860` (§9.30). Còn **575** treo: cần site không có 月次 kế tiếp |
| 832–839   | `inspection_relay_ovgr_setting` / `inspection_relay_ovgr` = 0 bản ghi trên env 207 (đếm lại 08-27 tối: vẫn 0) |
| 856–863   | `inspection_relay_general` = 0 bản ghi (đếm lại 08-27 tối: vẫn 0)                                    |

Vì sao 0 bản ghi là chặn cứng, không phải chuyện selector (verify 2026-08-27 tối):
`renovation-preview.ts` (comment đầu file, dòng 17–18) nêu rõ chỉ record **có dữ liệu** mới được emit
("empty rooms/blocks are dropped and the report page can hide empty tables/sections in preview mode"),
map qua `isOvgrRecordEmpty` (dòng 259) và `isGeneralRecordEmpty` (dòng 267). Backend lấy đúng bảng đó:
`rezil-esms/be-api/app/controllers/services/ReportService.scala:1580`
→ `InspectionRelayGeneralRepository.filterByInspectionIds`. Nên khi 2 bảng rỗng thì khối
`◆地絡過電圧継電器試験(OVGR/64)` và `◆継電器試験` **không render** trên bất kỳ report nào — không có màn
hình nào để khoanh đỏ. Muốn chụp phải seed dữ liệu vào env (console này chỉ được SELECT).
| 943       | 備考 của `inspection_withstand_voltage_dc` rỗng toàn env (§9.19)                                      |
| 951 · 953–962 | `RenovationCriteriaList.svelte` là bảng tĩnh, không có field tương ứng (§9.20)                   |

### 9.30 Popup annual 次回点検日を登録しました — dựng bằng submit thật (verify TC 569–574, 2026-08-27)

Popup chỉ hiện ở luồng **submit** (không có ở resubmit, xem `SELECTORS_NONAME007.md`). Điều kiện:
`inspection.category` ∈ {2,3} và backend tạo được next inspection (`SubmitInspectionReport.scala`
`isAutoCreateCategory` — 月次 + cả 2 loại 年次 đều tự tạo kế tiếp).

Bản ghi đã dùng: report `589860` / inspection = plan `1080087` (`1080087: MINSP-004`, site 40121
`Site_new`, `category` = 2 年次点検(無停電)). Sau submit: `plan.state` 11 → 12, `report.current_step`
1 → 2, backend tạo inspection `990017124` + plan `990018124` (work_start 2027-08-07, `state` 1).

Đường đi (mỗi bước 1 `--step eval:`, cùng 1 Chrome `--keep mob011`):

1. `.tabs__item` chứa `報告未完了` → `.tabs__button` bên trong → click.
2. `.plan-title` chứa `1080087: MINSP-004` → `.closest('.card')` → `.card__actions button` (nhãn
   `報告書作成` khi `report.current_step` = 1) → click → `wait:10000`.
3. `報告書を確認` → `報告書を提出する`. **Với report chưa từng submit, dialog mở ra ngay là dialog 2**
   `報告書を提出します。` (nút `未確認` / `確認しました`) — không đi qua dialog 1 `点検報告を提出の確認`.
4. `確認しました` = mutation `PUT /api/v1/inspection/report/submit/<report_id>`.

Selector của popup annual (`NextInspectionModal.svelte`):

| Selector                                          | Nội dung                                      | TC  |
|---------------------------------------------------|-----------------------------------------------|-----|
| `.next-inspection-modal`                          | Cả popup                                      | 568 |
| `.annual-radio-row`                               | 2 pill 年次点検（無停電）/（停電）, pill đầu selected  | 569 |
| `.annual-history .annual-history__row--first`     | Dòng `前回`                                    | 570 |
| `.annual-history .annual-history__row:nth-child(2)` | Dòng `前々回`                                  | 571 |
| `.annual-history .annual-history__row:nth-child(3)` | Dòng `停電周期`                                | 572 |
| `.next-inspection-modal__actions`                 | Nút `点検種別を選択して、次回の月次点検計画詳細を確認`  | 573 |
| `.plan-header__info` (màn MOB-008 sau khi click)  | Khối tiêu đề 点検計画詳細 của monthly kế tiếp      | 574 |

Click nút ở dòng 573 gọi `PUT /api/v1/inspection/next-plan/<next_inspection_id>/confirm-category`
rồi điều hướng MOB-008 của monthly kế tiếp (`GET /api/v1/inspection-plan/990018022` — plan monthly
sớm nhất của site 40121 có `work_start > CURDATE()` và `state IN (1,10)`).

Lưu ý khi kiểm ảnh: modal có sẵn dòng chữ đỏ `無停電か停電を選択してください。` nên `shot-check` luôn
đếm thêm ~4000 px đỏ và `box` bắt đầu ở y≈450 dù khoanh đỏ nằm thấp hơn — không phải lỗi khoanh.

TC 575 (popup `次の月次点検が登録されてません`) — quét lại DB 2026-08-27, **dữ liệu dựng được**, chỉ chặn ở
chỗ phải submit thật:

| Ứng viên | Plan | Site | category | state | report | 月次 tương lai của site |
|---|---|---|---|---|---|---|
| A | `540056` "540056 MINSP-004" | 14 | 2 (年次) | 11 (点検中) | chưa có | 0 |
| B | `900258` "ボリュームテスト点検30111-18" | 30111 | 2 (年次) | 1 (chưa 点検開始) | chưa có | 0 |

Câu đếm 月次 tương lai: `SELECT … FROM plan p JOIN inspection i ON i.id=p.inspection_id WHERE
i.site_id IN (14,30111) AND i.category=1 AND p.work_start > NOW()` → 0 dòng (mọi `state`).
Cả 2 plan đều đã assign `eid` = 4. Ứng viên A ngắn hơn (đã 点検中, chỉ cần tạo report).
Chi phí: phải tạo report mới + submit thật (plan 540056 `state` 11 → 12) + `PUT
/api/v1/inspection/next-plan/<id>/confirm-category` → **cần người dùng xác nhận trước khi chạy**.

### 9.30 TC 480 (submit thất bại → toast E-MSG-004) — dựng được bằng cách chặn XHR ở client

Pre-condition của TC là "submit失敗処理をシミュレートする", nên mô phỏng ở tầng client là đúng ý TC.
Đường lỗi trong code (repo mobile): `features/inspection-report/stores/report-submit.store.ts:90`
— `submitReport` catch mọi lỗi, `isNetworkError` **chỉ** được gán khi `isAdminMode` (`lib/api/HttpClient.ts:245`),
nên ở mobile thường mọi lỗi request đều ra `toast.error('VALIDATION_MSG.E-MSG-004')` và **không** điều hướng.

HTTP client là `axios` + adapter XHR (`HttpClient.ts:164-174`) → override `XMLHttpRequest.prototype.send`
bằng `--step eval:` chặn được request **trước khi rời browser** (không mutation nào chạm env):

```js
(function(){const S=XMLHttpRequest.prototype.send,O=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u){this.__m=(m||'').toUpperCase();this.__u=u;return O.apply(this,arguments)};
XMLHttpRequest.prototype.send=function(){if(this.__m!=='GET'){const me=this;setTimeout(()=>me.dispatchEvent(new Event('error')),50);return}
return S.apply(this,arguments)};window.__blockMutations=1})()
```

Chặn **mọi** method khác `GET` (không chỉ `/report/submit/`) để không có mutation nào lọt nếu selector sai.
Dữ liệu sẵn có (đo 2026-08-27): report emergency chưa submit của `eid` = 4 → `report` `589914`,
plan `990018087` (`category` 10, site 40121, `current_step` 1, `state` 11) — không cần tạo report mới.
