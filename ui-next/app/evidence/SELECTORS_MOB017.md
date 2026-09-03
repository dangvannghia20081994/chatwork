# Selector — MOB-017 設備 (Create/Edit Equipment, web mobile)

Verify 2026-08-28 trên env 207 (`http://mobile.10.9.17.207.nip.io`, viewport 744×1133,
profile `mob011`, keep `mobev`).

## Điều hướng

| Bước | Cách làm |
|---|---|
| Vào danh sách thiết bị | click `ion-tab-button` text `設備` |
| Mở màn Edit | click phần tử text `詳細` của card thiết bị (phần tử **đầu tiên** khớp) |

Lưu ý nav stack: khi đang ở màn Edit, click lại `ion-tab-button` `設備` **không** quay về danh sách —
tab giữ nguyên trang trong stack. Phải dùng nút back của màn.

## Selector đã verify (màn Edit)

| Phần tử | Selector | Ghi chú |
|---|---|---|
| Khối 添付ファイル | `.equip-attachments` | con: `__header`, `__label`, `__ai-btn`, `__body`, `__files` |
| Nút `AI銘板読み取り` | `.equip-attachments__ai-btn` | **2 node** khớp, node đầu có `width=0` → `__mark` trả `ZERO-SIZE`. Lọc `getBoundingClientRect().width>10` rồi gán id tạm |
| Danh sách file đính kèm | `.equip-file-list` | nút thêm: `.equip-file-list__add` |

Trạng thái nút AI khi **không có file**: `disabled=true`, `aria-disabled="true"`, class kèm
`button-disabled` (đúng Expected của TC 178).

## Chưa dò

- Màn **Create Equipment**: chưa tìm được đường vào từ tab `設備` (không thấy nút thêm mới trên
  danh sách). TC 43 (`用途` label + placeholder) còn treo vì chưa vào được màn này.
