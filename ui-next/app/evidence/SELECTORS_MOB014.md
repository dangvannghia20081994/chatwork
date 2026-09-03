# Selector — MOB-014 事業場一覧 (Site List, web mobile)

Verify 2026-08-28 trên env 207 (`http://mobile.10.9.17.207.nip.io`, viewport 744×1133,
profile `mob011`, keep `mobev`). App Ionic → **không có URL routing**, phải đi từ `/`.

## Điều hướng

| Bước | Cách làm |
|---|---|
| Vào màn | click `ion-tab-button` có text `事業場` (tab bar dưới cùng) |
| Mở khối lọc | click `ion-button` text `詳細検索` |
| Chạy tìm kiếm | click phần tử text `この条件で検索` (lấy phần tử **cuối** khớp text — panel 詳細検索 render sau) |
| Xoá điều kiện | click phần tử text `検索条件をクリア` |

## Selector đã verify

| Phần tử | Selector | Ghi chú |
|---|---|---|
| Ô lọc `エリア` (hiển thị `すべて`) | `.form-area-trigger` | 349×56, dùng cho TC 36 |
| Nút `都道府県・市区郡指定` | `p.typography` text `都道府県・市区郡指定` → `closest('ion-button,button')` (gán id tạm rồi `__mark('#id')`) | không có class riêng, dùng cho TC 37 |
| Ô lọc `需要設備点検周期` | `.form-multi-trigger` | cũng hiển thị text `すべて` |
| Danh sách kết quả | `.site-list` (712×566) | con: `.site-list__cards` › `.site-card` › `.site-card__header` / `.site-card__info` |

## Cạm bẫy

- Nhiều ô lọc cùng hiển thị chữ `すべて` (エリア và 需要設備点検周期). Chọn bằng `.pop()` theo text
  `すべて` sẽ bấm nhầm ô 需要設備点検周期 — luôn bấm qua `.form-area-trigger`.
- Dialog `都道府県・市区郡指定` liệt kê **511 checkbox** (tỉnh + quận/huyện). Click vào text tên tỉnh
  (`大阪府`) **không** chọn được; phải click `input[type=checkbox]` nằm trong `closest('label,li,div')`
  có chứa tên quận (ví dụ `西淀川`), rồi bấm `保存`.
- Sau khi bấm `保存` của dialog, panel 詳細検索 vẫn mở; giá trị đã chọn hiện ngay dưới nút
  `都道府県・市区郡指定`.
