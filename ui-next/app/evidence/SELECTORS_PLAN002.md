# SELECTORS — PLAN-002 点検計画詳細 (Create Inspection Plan), web admin

Verify 2026-08-27 trên env 207, viewport 1440×900, `--login rezil-admin --profile rezil-admin`,
Chrome keep `plan002`. Route: `/admin/schedule/plan/create` (detail: `/admin/schedule/plan/<planId>`).
Component: `rezil-esms/app/src/lib/modules/schedule/components/plan-detail/CreatePlanForm.svelte`.

## Khối 外注業者 (outsourced client) — TC 76

| Phần tử | Selector | Ghi chú |
|---|---|---|
| Link mở dialog | `a` có text `外注業者を選択` | class `link link--default link--medium` (kèm hash Svelte, không dùng hash) |
| Dialog | `.outsourced-client-select-dialog` | root là `<dialog>` modal, nội dung `.outsourced-dialog` |
| Danh sách chọn (trái) | `.outsourced-dialog__list-item input[type=checkbox]` | env 207 có 3 client |
| Panel đã chọn (phải) | `.outsourced-dialog__right` | chứa item + message lỗi |
| 1 dòng đã chọn | `.outsourced-dialog__selected-item` | |
| Input 人数 | `.outsourced-dialog__count input` | class ngoài là `.outsourced-dialog__count-input` (div wrapper), input thật là `input.input__field` |
| Message lỗi 人数 | `.outsourced-dialog__count-error` | `外注業者人数は必須項目です` (E-MSG-010) |
| Nút dialog | `.outsourced-dialog__actions button` → `キャンセル`, `保存` | |

## Cạm bẫy đã gặp

- **Tick checkbox tự điền `人数 = 1`** (`toggle()` set `counts[key] = '1'` khi `counts[key] == null`).
  Muốn dựng ca required-error thì phải **xoá rỗng input** rồi mới bấm `保存`.
- Input là component Svelte nghe `onValueChange` → gán `input.value` trần **không có tác dụng**.
  Phải dùng native setter rồi dispatch event:
  ```js
  const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  s.call(inp,''); inp.dispatchEvent(new Event('input',{bubbles:true})); inp.blur();
  ```
- **Overlay khoanh đỏ bị dialog che.** Dialog này là `<dialog>` modal → nằm ở top layer, đè mọi
  `z-index` của node trong `body`. `window.__mark` mặc định `document.body.appendChild` nên viền đỏ
  **không xuất hiện trong ảnh** (ảnh 3 lần chụp ra MD5 giống nhau, `shot-check` báo `WEAK` vì chỉ bắt
  được chữ đỏ của app). Cách sửa: append overlay vào chính dialog —
  `const host = document.querySelector('dialog[open]') || document.body; host.appendChild(d);`
  Sau khi sửa: `red=5154`, `shot-check` `OK`.
  (Dialog `ConfirmDialog` của PLAN-002 detail **không** ở top layer — append vào `body` vẫn hiện.)
- Bấm `保存` trong dialog 外注業者 chỉ ghi vào form state của màn create, **không** gọi API → an toàn.

## TC không chụp được bằng script

TC 91, 92 (`Output log` khi create plan thành công / thất bại) cần đọc application log của server env 207 —
console `/evidence` không có quyền đó. Đã ghi lý do vào cột N của 2 dòng (row 114, 115), cột M để trống.
