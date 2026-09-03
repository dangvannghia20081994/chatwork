# SELECTORS — TEMPLATE-002 (web admin, SvelteKit)

Dùng chung cho 2 tab `TEMPLATE-002 Template Detail (View/Edit)` và `TEMPLATE-002 (Create/Duplicate)`.
Verify 2026-08-27 trên env 207 (`http://admin.10.9.17.207.nip.io`), mode **create**.

## Phiên chụp

| Mục            | Giá trị đã verify                                                                     |
|----------------|---------------------------------------------------------------------------------------|
| Login preset   | `--login rezil-admin` (`input[name=email]` / `input[name=password]` / `button[type=submit]`) — `POST /api/auth/login` → 200. **Không** dùng preset `rezil` (form Ionic của app mobile) |
| Profile        | `--profile rezil-admin`                                                                 |
| Viewport       | `--width 1440 --height 900` (ảnh ra 1440×900, shot-check `OK`)                          |
| Keep-alive     | `--keep tpl002` … `--keep-stop tpl002`                                                  |
| GPS            | Không cần — màn admin không chặn theo vị trí                                            |
| Route          | list `/admin/template` · view/edit `/admin/template/<id>` · create `/admin/template/create` · duplicate `/admin/template/<id>/duplicate`. `goto:` dùng được (có URL routing) |

**Cạm bẫy `--no-shot`**: cờ này tắt cả `--step shot:<nhãn>`, không chỉ ảnh cuối. Lượt nào cần ảnh thì
bỏ `--no-shot` (mất 2 lệnh vì lỗi này ngày 2026-08-27).

## Form template (create / duplicate / edit)

Mỗi field là `.form-field` chứa `.form-field__label`, control và `.form-field__error` (khi lỗi).
Dropdown là component tự viết: `<select name=... aria-hidden>` (giữ giá trị) + `button.select-trigger`
(hiển thị) + panel `.select-dropdown > .select-options-list > .select-option > .select-option__label`,
tất cả nằm trong `.select-container` → chọn field theo `:has()`:

```
.select-container:has(select[name=category]) .select-trigger
.form-field:has(select[name=level2])            # khoanh đỏ cả field + message lỗi
.select-container:has(select[name=safetyType]) .select-dropdown   # khoanh đỏ option list đang mở
```

| Field (label)          | `select[name=…]` / selector             |
|------------------------|------------------------------------------|
| ステータス                  | `state`                                  |
| 定型文カテゴリ ＊              | `category` (1 指摘事項 · 2 特記事項 · 3 今月の重点項目 · 4 保安教育 · 5 緊急対応) |
| 点検項目 ＊                 | `level1`                                 |
| 事象 ＊                   | `level2`                                 |
| 機器名称 ＊                 | `level3`                                 |
| 指摘事項項目 ＊               | `safetyType`                             |
| 改修区分                   | `repairPriority` (至急 · 急 · 適時 · 経過観察) — **required trên thực tế** dù label không có ＊ |
| 報告内容 ＊                 | `textarea[name=content]`                 |
| 備考                     | `textarea[name=note]`                    |
| 高度化要件適否                | `isAdvancedRemediation`                  |
| 保存                     | `.app-button--primary` (2 nút: header + cuối form, click nút nào cũng submit) |

`level1/2/3` chỉ nạp option sau khi chọn `category` (`GET /api/dropdown/template/level/{1,2,3}?categories=<n>`),
chờ ~1200ms sau khi chọn category. `safetyType` khi `category` = 1–4 là danh sách 月/改修…, khi
`category` = 5 (緊急対応) đổi thành 9 mục `受付経緯(…)` / `対応種別(…)` / `原因(…)`.

## Helper chọn dropdown (inject 1 lần mỗi lần load trang)

```js
window.__pick = async (n, l) => {                      // chọn option theo label
  const c = document.querySelector('.select-container:has(select[name=' + n + '])');
  if (!c) return 'NOCONT';
  c.querySelector('.select-trigger').click();
  await new Promise(r => setTimeout(r, 500));
  const opts = [...c.querySelectorAll('.select-option')];
  const o = opts.find(x => x.textContent.trim() === l);
  if (!o) return 'NOOPT:' + opts.map(x => x.textContent.trim()).join('|');
  o.click(); await new Promise(r => setTimeout(r, 400));
  return 'picked=' + c.querySelector('.select-trigger').textContent.trim();
};
window.__opts = async n => { /* như __pick nhưng chỉ mở panel và trả danh sách option */ };
```

Cạm bẫy: `__opts` **để panel mở**. Gọi `__pick`/`__opts` tiếp trên đúng field đó sẽ click trigger lần
nữa và **đóng** panel → trả `NOOPT:` rỗng. Gửi `key:Escape` trước, hoặc đừng gọi 2 lần liên tiếp cùng field.

## Validation (verify 2026-08-27, mode create)

Bấm `保存` khi thiếu field required: **không** phát request nào (validate phía client, không tạo bản ghi),
message hiện trong `.form-field__error` của đúng field:

| Thiếu field      | Message                |
|------------------|------------------------|
| `level2`         | `事象は必須項目です`           |
| `level3`         | `機器名称は必須項目です`         |
| `repairPriority` | `改修区分は必須項目です`         |

Cột Expected Result của sheet ghi `E-MSG-010: 点検項目は必須項目です` cho cả TC 78 / 80 — phần tên field
trong sheet là lỗi copy, message thật đổi theo field.

## Bộ dữ liệu dùng để chụp (không tạo bản ghi)

`category` = 指摘事項 · `level1` = 高圧機器 · `level2` = 設備異常 · `level3` = 高圧機器 ·
`safetyType` = 改修要請 · `repairPriority` = 適時 · `content` = `点検報告テスト内容`.
Bỏ trống đúng field đang kiểm rồi bấm `保存`.

## Mode `category` = 5 緊急対応 (verify 2026-08-27)

- `level1` / `level2` / `level3` **không còn required** — bỏ trống vẫn lưu được (đúng Expected của TC 79/81/83).
- Option của 3 dropdown này khi category = 5 chỉ còn dữ liệu do tester tạo: `level1` = `Test new`,
  `level2` = `Test new`, `level3` = `Test_new23432` (+ `新規登録`).
- `repairPriority` không có option nào → không áp dụng cho category = 5.
- Lưu thành công: `POST /api/issue-template` 200 → điều hướng sang `/admin/template/<id>`, toast
  `新規登録完了しました`. **Toast tự tắt trong ~3s** — muốn chụp toast thì `shot:` ngay trong lần chạy
  bấm `保存`; chụp lượt sau chỉ còn màn detail.
- Bản ghi đã tạo trên env 207 khi chụp TC 81 / TC 83: `TP-111127` (id 111127) và `TP-111128` (id 111128).
