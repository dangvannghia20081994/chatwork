# SELECTORS — NONAME-007 Inspection Common (web admin)

Verify 2026-08-27 trên env 207 (`http://admin.10.9.17.207.nip.io`), viewport 1440×900,
`--login rezil-admin --profile rezil-admin-b`, Chrome keep `noname007`.

Màn thật của các TC 59 → 70 là **PLAN-002 Inspection Plan Detail** (`/admin/schedule/plan/<planId>`),
tab NONAME-007 chỉ kiểm phần dùng chung. Component: `rezil-esms/app/src/lib/modules/schedule/pages/PlanDetailPage.svelte`.

## Selector đã verify

| Phần tử | Selector | Ghi chú |
|---|---|---|
| Nút start/restart/report-correction | `.plan-detail-start-btn` | thêm class `.plan-detail-restart-btn` khi `state = 11`; label lấy từ `PLAN_DETAIL.action.*` |
| Thanh action đáy | `.plan-detail-actions` | chỉ render khi `showStartInspection` |
| Dialog xác nhận 点検開始 | `.confirm-dialog__content` | title `.confirm-dialog__title`, body `.start-dialog-rows` |
| Nút trong dialog | `.confirm-dialog__actions button:first-child` = `キャンセル`, `:last-child` = `開始` | thứ tự đảo khi `swapButtons` |

Màu nút (giá trị `getComputedStyle().backgroundColor` đã đo):
- `state = 10` → `点検開始`, `rgb(0, 113, 128)` (xanh, primary).
- `state = 11` không reject → `点検再開`, `rgb(186, 26, 26)` (đỏ).
- `state = 11` + `report.current_step = 1` + `is_rejected = 1` → `報告書修正`, `rgb(186, 26, 26)` (đỏ).

## Điều kiện dựng dữ liệu

Nút chỉ hiện khi API `GET /api/inspection-plan/<planId>` trả `canStartInspection = true`
(`PlanDetailPage.svelte:266`) **và** `stateId ∈ {10, 11}`. Không suy ra được từ DB — phải mở màn để kiểm.

Plan đã dùng (env 207, 2026-08-27):

| TC | plan_id | Trạng thái DB |
|----|---------|----------------|
| 59, 62, 63 | `990018100` | `state = 10`, `plan_assignment` eid 4 role 1 |
| 60 | `990018110` | `state = 11`, report `current_step = 1`, `is_rejected = 0` |
| 61 | `1080084` | `state = 11`, report `current_step = 1`, `is_rejected = 1` |

## Cạm bẫy đã gặp

- **Nhiều plan seed `9900xxx` trả `404` ở `GET /api/inspection-plan/<id>`** dù DB có bản ghi
  (đã gặp: `990018105`, `990018024`). Trang vẫn render khung nhưng không có thanh action →
  đừng kết luận "nút không hiện" trước khi xem status của request đó trong bảng Network của `debug.mjs`.
- Gọi `fetch('/api/inspection-plan/<id>')` bằng tay trong `--step eval:` trả **500** (thiếu header app tự thêm).
  Muốn biết `canStartInspection` thì mở đúng URL màn rồi kiểm DOM, không fetch tay.
- `--renav` **xoá `window.__mark`** đã inject (trang load lại). Sau mỗi `--renav` phải inject lại snippet
  trong cùng lệnh, trước bước `__mark`.
- Bấm `点検開始` khi `state = 10` **chưa mutation** — chỉ mở dialog `この点検を開始しますか？`.
  Mutation nằm ở nút `開始` trong dialog (`PUT` state 10 → 11 + update KYK + mở tab MOB-010).
  Bấm `キャンセル` đóng dialog, `dialog.common-dialog[open]` về `false`, dữ liệu không đổi.

## TC cần mutation trên env — chưa chụp (đo 2026-08-27)

Đọc `PlanDetailPage.svelte:338-423` (`handleStartInspection` / `onStartInspectionClick`):

| TC | Thao tác bắt buộc | Hệ quả trên env 207 |
|----|-------------------|---------------------|
| 57, 58, 64 | Nút `開始` trong dialog (`state = 10`) | `UPDATE plan SET state = 11, gps_*, weather_information, actual_work_start` + `UPDATE inspection_precheck_item SET is_completed = 1` |
| 65 | Nút `点検再開` (`state = 11`) | gọi thẳng `handleStartInspection()` → `POST /api/admin/plan/{id}/inspection/start` (không qua dialog) |
| 66 | Nút `報告書修正` (`state = 11` + report reject draft) | cũng đi qua `handleStartInspection()` — **không** phải chỉ điều hướng; vẫn gọi API start |
| 67 → 70 | Phải ở trong tab MOB-010/MOB-011 mở từ luồng trên | chỉ vào được sau khi đã gọi API start |
| 48, 49 | Resubmit report thật trên mobile | `PUT /api/v1/inspection/report/resubmit/<report_id>` + tạo next inspection |

TC 56 chụp được vì bấm `点検開始` khi `state = 10` chỉ mở dialog; đã dùng plan `990018100`
(`state = 10`, nút xanh `rgb(0, 113, 128)`), chụp 2 ảnh (`_056_1` nút, `_056_2` dialog) rồi bấm
`キャンセル` — kiểm lại `dialogOpen=false`, dữ liệu không đổi.

## Đợt mutation 2026-08-27 chiều (được người dùng cho phép bấm 開始 / 点検再開)

Đã chạy thật trên env 207, ghi cột M cho TC 64, 65, 66, 68, 69, 70:

| Plan | Thao tác | Kết quả đo lại |
|------|----------|----------------|
| `990018100` | dialog → `開始` | `POST /api/admin/plan/990018100/inspection/start` 200; DB: `state` 10 → 11, `actual_work_start = 2026-08-27 11:04:36Z`, 2 `inspection_precheck_item` precheck → `is_completed = 1`, `eid = 4` |
| `990018110` | `点検再開` | `POST …/990018110/inspection/start` 200, mở tab MOB-010 kèm `handshake=<uuid>` |
| `1080084` | `報告書修正` | `POST …/1080084/inspection/start` 200, tab con là **MOB-011 点検報告** (header `点検報告`, có khối 差し戻し理由) |

Selector tab con (mobile web, viewport 744×1133):

| Phần tử | Selector | Ghi chú |
|---|---|---|
| Header MOB-010 (khối inspection) | `.inspection-header__main` | nút Back `.header__back` **không render** ở admin mode (`InspectionHeader.svelte:56`) |
| Tiêu đề inspection MOB-010 | `.info__main` | dùng cho ảnh "MOB-010 đã mở" |
| Dòng thời gian / 担当者 | `.info__sub` | dùng cho ảnh TC 70 |
| Slot switch_plan | `.main__weather` | admin mode render `WeatherInfo`; không có weather → div **kích thước 0** → `__mark` trả `ZERO-SIZE`, phải khoanh phần tử khác |
| Header MOB-011 | `.header__left` (= `.header__title-wrap`) | `.header__container` chạm mép viewport → `shot-check` gắn cờ `EDGE`, không dùng |

Cạm bẫy multi-tab: `debug.mjs` attach vào page target **đầu tiên** trong `/json`; tab mở bằng
`window.open` đứng đầu danh sách nên lệnh attach kế tiếp rơi vào tab con. Muốn quay lại tab admin thì
đóng tab con bằng `--step "eval:window.close()"`. Kiểm danh sách tab:
`curl -s http://127.0.0.1:<port>/json` với port trong `ui-next/.chrome-profiles/.keep-noname007.json`.

TC 67 (session hết hạn) **chưa dựng được**: đã thử đặt `remember = true` + `date` lùi 8 ngày trong
`localStorage['CapacitorStorage.secure_storage_auth']` rồi phát `pointerdown` (đường kiểm ở
`App.svelte:180`), app không gọi `Nav.gotoLogin()`. Đường redirect đúng là
`AdminProxyLogic.notifySessionExpired()` (`admin-proxy.logics.ts:241`) → `<adminOrigin>/admin/schedule/plan/<pid>`.
Muốn chụp thì chờ idle 60 phút thật hoặc thao tác tay.

TC 57, 58 là kiểm dữ liệu bảng (`plan`, `inspection_precheck_item`), không có màn hiển thị →
để trống cột M, đã ghi lý do + số liệu SELECT vào cột N.

## Luồng resubmit trên web mobile (verify 2026-08-27, TC 48/49)

Đường đi đã chạy thật với report `589858` / plan `1080084` (site 4, `is_rejected = 1`, có `report_signature` id 23):

1. Home → `ion-tab-button` chứa `ホーム` → `.tabs__item` chứa `報告未完了` → `.tabs__button` bên trong.
2. Tìm card theo `.plan-title` **và ngày hiển thị** (3 card cùng title `YenLTB 阪奈中央病院増築棟 / 月次点検`;
   phân biệt bằng dòng ngày `2026年07月30日(木) 12:00〜13:00` = plan 1080084) → nút `報告書修正` trong `.card__actions`.
3. `報告書を確認` → xác nhận đúng report bằng request `GET /api/v1/report-summary/inspection/<planId>`.
4. `報告書を提出する` → **với report `is_rejected = 1` dialog mở ra ngay là `.confirm-resubmit-modal`**
   (`.modal__inner` 608×584, có textarea + `キャンセル` / `提出する`), KHÔNG đi qua chuỗi 2 dialog của luồng submit thường.
5. Nhập comment: set `.confirm-resubmit-modal textarea` bằng native setter + `new Event('input',{bubbles:true})`
   (binding Svelte không nhận nếu chỉ gán `.value`).
6. `提出する` trong dialog = mutation `PUT /api/v1/inspection/report/resubmit/<report_id>`.

### Kết quả thực tế sau resubmit (đo 2026-08-27)

Popup hiện ra: `.next-inspection-modal` với `再提出が完了しました` / `報告書の再提出が完了しました。`,
nút `次回の計画詳細へ移動` · `ホームへ移動`. DB sau đó: `plan.state` 11 → 12, `report.current_step` 1 → 2, `is_rejected` 1 → 0.

**Biến thể annual (`次回点検日を登録しました` + nút `点検種別を選択して、次回の月次点検計画詳細を確認`) không tái hiện được bằng resubmit**:
`NextInspectionModal.svelte:63` — `isAnnualVariant = (category ∈ {2,3}) && nextInspectionId && workDate`, còn
`report-submit.store.ts` `resubmitReport()` chỉ set `nextPlanId` rồi `resetNextInspectionWorkDateStore()`
(comment trong component: "Rich annual modal only on submit-create (next annual registered), not on resubmit").
Chỉ `submitReport()` set `nextInspectionId` / `nextCategory` / `annualHistory`.
Thêm nữa: env 207 không có report nào `is_rejected = 1` mà `inspection.category ∈ {2,3}` (SELECT 2026-08-27 trả 0 dòng).

`inspection.category` = 1 là **月次点検**, không phải 年次 — annual là 2 (`無停電`) / 3 (`停電`).

## Biến thể admin của popup annual — chặn ở công cụ, không ở code (verify 2026-08-27)

TC 49 (`点検種別を選択して、次回の月次点検計画詳細を確認` → quay lại PLAN-002 + message `点検実施完了しました。`)
**có** nhánh tương ứng trong build hiện tại: `NextInspectionModal.svelte` `handleConfirmCategory()` kiểm
`$isAdminMode` trước tiên và gọi `AdminProxyLogic.notifyComplete()` rồi return — không gọi
`confirm-category` cũng không điều hướng MOB-008 (nhánh mobile thường, đã chụp ở MOB-011 TC 573/574).

Chặn nằm ở công cụ: nút này chỉ có trong biến thể annual của popup, mà biến thể annual chỉ xuất hiện ở
**luồng submit** (xem mục resubmit ở trên) — trong luồng admin proxy thì màn MOB-010/MOB-011 nằm ở
**tab con** do `window.open('', '_blank')` + handshake token mở ra. `ui-next/scripts/debug.mjs` điều khiển
1 target CDP duy nhất (không có `Target.getTargets` / `attachToTarget` trong script), nên không thao tác
được trong tab con. Muốn chụp TC 49 phải chụp tay hoặc bổ sung hỗ trợ đa tab cho `debug.mjs`.

