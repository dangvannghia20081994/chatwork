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

| Selector                                                | Phần tử                                                            | Màn / trạng thái   | Nguồn (`rezil-esms-mobile/app/src`)                                        | Verify     |
|---------------------------------------------------------|--------------------------------------------------------------------|--------------------|----------------------------------------------------------------------------|------------|
| `.tabs__item`                                           | 1 tab trong dải tab của màn Home (`本日の予定` / `点検報告未完了` / `点検計画未確定`) | Home               | `features/home/components/TabsMenu.svelte:37`                              | 2026-08-26 |
| `.card`                                                 | 1 thẻ inspection trong danh sách                                   | Home, các tab      | `features/home/components/UnplannedCard.svelte`                            | 2026-08-26 |
| `.plan-title`                                           | Tên inspection trên thẻ — click để mở báo cáo                      | Home               | `features/home/components/UnplannedCard.svelte:135`                        | 2026-08-26 |
| `.card__actions button, .card__actions ion-button`      | Nút hành động trên thẻ (`報告書修正`…)                                  | Home               | `features/home/components/UnplannedCard.svelte:147`                        | 2026-08-26 |
| `ion-tab-button`                                        | Tab dưới cùng (`ホーム` / `予定` / `事業場` / `設備`)                        | Toàn app           | Ionic tab bar                                                              | 2026-08-26 |
| `.calendar__day`                                        | 1 ô ngày trong lịch tháng                                          | 予定 → xem tháng     | `features/plan/components/list/MonthView.svelte:124`                       | 2026-08-26 |
| `.calendar-item__name`                                  | Tên kế hoạch trong ô ngày                                          | 予定                 | `features/plan/components/list/CalendarItem.svelte:35`                     | 2026-08-26 |
| `.timeline__event-name`                                 | Tên event trong modal xem theo ngày                                | 予定 → modal ngày    | `features/plan/components/list/DailyViewModal.svelte:176`                  | 2026-08-26 |
| `.header__title`                                        | Tiêu đề header — dùng để xác nhận đang ở đúng màn                  | Toàn app           | `lib/components/header/Header.svelte:67`                                   | 2026-08-26 |
| `.confirm-modal`                                        | **Wrapper** dialog confirm (phủ kín viewport)                      | Mọi dialog confirm | `lib/components/modals/ConfirmModal.svelte:58`                             | 2026-08-26 |
| `.modal__inner`                                         | **Khung nội dung** của dialog — selector cần khoanh đỏ             | Mọi dialog         | `lib/components/Modal.svelte:164`                                          | 2026-08-26 |
| `.confirm-modal button, .confirm-modal ion-button`      | 2 nút trong dialog confirm                                         | Dialog confirm     | `lib/components/modals/ConfirmModal.svelte`                                | 2026-08-26 |
| `.customer-acknowledgement__signature-image`            | Ô ảnh chữ ký của người chứng kiến — click để mở popup ký           | MOB-011 (editable) | `features/inspection-report/components/CustomerAcknowledgement.svelte:292` | 2026-08-26 |
| `.signature-modal__canvas`                              | Canvas để vẽ chữ ký                                                | Popup ký           | `features/inspection-report/components/SignatureModal.svelte:191`          | 2026-08-26 |
| `.report-submitted-modal__actions button, … ion-button` | Nút trong modal "đã submit" (`ホームへ移動`)                             | Sau khi submit     | `features/inspection-report/components/ReportSubmittedModal.svelte:51`     | 2026-08-26 |
| `.next-inspection-modal__content`                       | Vùng nội dung modal 次回点検                                           | Modal 次回点検         | `features/inspection-report/components/NextInspectionModal.svelte:147`     | 2026-08-26 |
| `.next-inspection-modal__actions button, … ion-button`  | Nút trong modal 次回点検                                               | Modal 次回点検         | `features/inspection-report/components/NextInspectionModal.svelte:157`     | 2026-08-26 |
| `.annual-subtitle > p`                                  | Dòng phụ đề của khối 年次 trong modal 次回点検                           | Modal 次回点検         | `features/inspection-report/components/NextInspectionModal.svelte:168`     | 2026-08-26 |
| `.issue-detail__list-item`                              | 1 dòng trong danh sách 指摘事項                                        | MOB-011            | `features/inspection-report/components/IssueDetail.svelte:96`              | 2026-08-26 |
| `.remark-detail`                                        | Khối 備考                                                            | MOB-011            | `features/inspection-report/components/RemarkDetail.svelte:93`             | 2026-08-26 |

## 2. Cạm bẫy đã gặp (đọc trước khi khoanh đỏ)

| Hiện tượng | Nguyên nhân | Cách làm đúng |
|---|---|---|
| `__mark` trả `marked` nhưng ảnh **không có viền đỏ** | `.modal` khớp một phần tử **ẩn** khác trong DOM | Dùng `.confirm-modal`, không dùng `.modal` |
| Viền đỏ vẽ ngoài khung ảnh | `.confirm-modal` là wrapper phủ kín viewport (744×1133) | Khoanh phần tử con `.modal__inner` (616×326) |
| Selector khớp 0 phần tử sau khi app build lại | Dùng class hash Svelte | Chỉ dùng class BEM ở bảng §1 |
| Nút cần bấm không có class riêng | Nhiều nút dùng chung `button` / `ion-button` | Dùng công thức tìm theo text ở §3 |

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

| Nhãn       | Phạm vi tìm                        | Việc                                                         |
|------------|------------------------------------|--------------------------------------------------------------|
| `予定`       | `ion-tab-button`                   | sang tab lịch                                                |
| `報告書を確認`   | `button, ion-button`               | vào chế độ Confirm của báo cáo                               |
| `報告書を提出する` | `button, ion-button`               | mở dialog 1 của luồng submit                                 |
| `提出する`     | `.confirm-modal`, `.modal__inner`  | nút xác nhận trong dialog — **là bước gây mutation, xem §4** |
| `確認しました`   | `.confirm-modal`                   | nút xác nhận cuối — **gây mutation**                         |
| `ホームへ移動`   | `.report-submitted-modal__actions` | về Home sau khi submit                                       |

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
