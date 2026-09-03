# SELECTORS — TECH-001 Engineer List (web admin)

Verify 2026-08-27 trên env 207 (`http://admin.10.9.17.207.nip.io/admin/engineer`), viewport 1440×900,
`--login rezil-admin --profile rezil-admin`, Chrome keep `tech001`.
Component: `rezil-esms/app/src/lib/modules/engineer/` (`logics/useListLogic.ts`, `components/FilterForm.svelte`).

## Selector đã verify

| Phần tử | Selector | Ghi chú |
|---|---|---|
| Khung table cuộn ngang | `.data-table-wrapper` | `scrollWidth` 7302 > 1440 → phải `scrollLeft = scrollWidth` mới thấy nhóm cột cuối |
| Header cột | `table thead th` | 49 `th`; index 0 là cột checkbox |
| Checkbox `ユーザアカウント紐づけあり` | `input[name=linkedUser]` | `.click()` được trực tiếp (input thật, không bị ẩn) |
| Checkbox `ユーザアカウント紐づけなし` | `input[name=notLinkUser]` | |
| Nút `検索する` | `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='検索する')` | không có class riêng |
| Combobox `技術者取引先` | trigger `button[aria-controls=clientIds-listbox]`, listbox `#clientIds-listbox`, option `[role=option]` | multi-select tự dựng, **không** phải `<select>`; đóng lại bằng cách click trigger lần 2 |

Index cột `保有機械器具` (sau khi `scrollLeft = scrollWidth`, đều nằm trong viewport 1440):

| TC | Cột | th index | Label |
|----|-----|----------|-------|
| 122 | borrowed_equipment_1 | 41 | 保有機械器具セクション |
| 123 | borrowed_equipment_2 | 42 | 短絡設置器具 |
| 124 | borrowed_equipment_3 | 43 | GR試験器 |
| 125 | borrowed_equipment_4 | 44 | OCR試験器 |
| 126 | borrowed_equipment_5 | 45 | 5000Vメガ |
| 127 | borrowed_equipment_6 | 46 | バッテリー小 |
| 128 | borrowed_equipment_7 | 47 | バッテリー大 |
| 129 | borrowed_equipment_8 | 48 | 耐圧試験器 |

## Cạm bẫy đã gặp

- 8 cột `保有機械器具` khai báo `hidden: true` trong `useListLogic.ts:405` (ẩn mặc định, bật qua
  `表示項目設定`). Trên profile `rezil-admin` env 207 chúng **đang hiện** vì
  `GET /api/preference/engineer-list/view-config` trả sẵn cấu hình bật — kiểm bằng
  `document.querySelectorAll('table thead th').length` (49 = đã bật) trước khi đi mở dialog cấu hình.
- Khoanh đỏ theo cột phải **kẹp toạ độ trong viewport**: `__markCol` bản đầu vẽ tới `innerHeight-8`
  → `shot-check` báo `OK +EDGE` cả 8 ảnh (viền chạm mép, có thể bị cắt). Bản dùng được kẹp
  `top ≥ 24`, `bottom ≤ innerHeight-24`, `left ≥ 24`, `right ≤ innerWidth-24` → 8/8 `OK` không cờ.
- Vị trí `th` đổi theo việc panel filter đang mở/đóng: lần chạy đầu `th.y = 11` (trang đã cuộn dọc),
  lần mở lại `th.y = 552`. Đừng hardcode toạ độ, luôn đọc `getBoundingClientRect()` trong lượt.
- Class Svelte có hash theo build (`s-UXKdGXR36KRh`, `s-kyCdivxy26uX`) → không dùng hash trong selector.
- Combobox `技術者取引先`: sau khi `option.click()` thì `.select-multiple-search-label` vẫn rỗng, nhưng
  `button[aria-controls=clientIds-listbox].textContent` đã là tên client đã chọn → kiểm bằng text của
  trigger, không kiểm span label. Ngoài ra `.select-multiple-search-container` đầu tiên trong DOM là
  combobox **khác** (技術者名) → khoanh đỏ phải neo từ trigger: `closest('.form-field')`.

## Snippet `__markCol` (bản đã kẹp toạ độ)

```js
window.__markCol=(i)=>{const th=document.querySelectorAll('table thead th')[i];if(!th)return 'NOTFOUND:th'+i;
const tr=th.getBoundingClientRect();if(!tr.width||!tr.height)return 'ZERO-SIZE:th'+i;
const tds=Array.from(document.querySelectorAll('table tbody tr')).map(r=>r.children[i]).filter(Boolean)
  .map(c=>c.getBoundingClientRect()).filter(r=>r.width&&r.top<innerHeight-40&&r.bottom>0);
const raw=tds.length?tds[tds.length-1].bottom:tr.bottom;
const top=Math.max(24,tr.y-3), bottom=Math.min(innerHeight-24,raw+3);
const left=Math.max(24,tr.x-3), right=Math.min(innerWidth-24,tr.right+3);
const d=document.createElement('div');d.className='__mark';
d.style.cssText=`position:fixed;left:${left}px;top:${top}px;width:${right-left}px;height:${bottom-top}px;
border:3px solid #e00;border-radius:4px;z-index:2147483647;pointer-events:none`;
document.body.appendChild(d);return 'marked '+th.textContent.trim().slice(0,14)+' rows='+tds.length};
```
