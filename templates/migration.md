# Migration template — rezil-esms (Flyway)

> Áp dụng khi ticket yêu cầu thay đổi schema/data (CREATE/ALTER/DROP table, index,
> column, seed data...). Nguồn chuẩn: `rezil-esms/etc/database/MIGRATIONS.md`.

## Bắt buộc — sinh file bằng script, KHÔNG gõ tay version

Chạy từ **repo root** của `rezil-esms`:

```bash
./etc/scripts/new-migration.sh <db> <folder> "<mô tả free-text>"
```

- `<db>`: `esms` (= schema `rezil_esms`) hoặc `inspection` (= `rezil_esms_inspection`).
- `<folder>`:
  - `common` — chạy cho **mọi env** (mặc định cho DDL logic/nghiệp vụ).
  - `env-dev1` / `env-dev2` / `env-stg` / `env-prod` / `env-local` — chỉ riêng env đó
    (chỉ dùng khi thay đổi thật sự đặc thù một env, ví dụ seed data khác nhau).
- Script tự sinh tên `V<YYYYMMDDHHMMSS>__<slug>.sql`, slugify mô tả, đặt đúng folder,
  in ra đường dẫn → mở file đó viết DDL.

Nếu không có script (repo khác/hỏng): lấy timestamp bằng `date +%Y%m%d%H%M%S`, đặt tên
`V<timestamp>__<desc>.sql` trong `etc/database/<schema>/<folder>/`. **Không tự gõ số version.**

## 3 điều bắt buộc nhớ

1. **KHÔNG đổi tên / sửa nội dung migration đã apply** trên bất kỳ DB nào (đã nằm trong
   `flyway_schema_history` → đổi sẽ lệch version/checksum, `validate` fail). File cũ
   `V<YYYYMMDD>_<NN>__...` giữ nguyên; convention timestamp chỉ áp cho file mới.
2. **Timestamp chỉ tránh trùng *version*, không tránh trùng *logic*.** Hai branch cùng
   `ALTER` một bảng/cột vẫn là conflict thật — xử lý tay, quyết thứ tự áp dụng.
3. **Out-of-order tránh fail chứ không tránh sai phụ thuộc.** Migration B phụ thuộc object
   do A tạo → B phải có timestamp lớn hơn A và release cùng bộ.

## Nội dung file SQL

- Một thay đổi logic cho một file (giống 1 commit).
- DDL rõ ràng, có comment ngắn nếu cần; đặt tên index/constraint theo convention bảng hiện có.
- Kiểm tra kỹ trước khi commit — migration đã lên env là **không sửa được**.

## Chạy thử

```bash
cd be-api && sbt migrateAll   # apply cho các schema; history ở flyway_schema_history
```
