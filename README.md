# rezil-docker

Local development stack for Rezil ESMS (admin + mobile). Nó orchestrate MySQL, MinIO, các backend Scala/Play (`admin-api`, `mobile-api`), các frontend Vite (`admin-web`, `mobile-web`), Nginx reverse proxy và Swagger UI thông qua Docker Compose.

## Cấu trúc thư mục yêu cầu

`rezil-docker` reference đến các sibling repo qua bind mount:

```
IdeaProjects/rezil/
├── rezil-docker/          # repo này
├── rezil-esms/            # admin (BE + FE)
├── rezil-esms-mobile/     # mobile (BE + FE)
└── rezil-esms-lib/        # shared Scala lib (build vào image)
```

Clone đủ 4 repo cùng cấp trước khi chạy.

## Khởi động lần đầu

```bash
# 1. Build các image local
docker compose build

# 2. Khởi động toàn bộ stack
docker compose up -d

# 3. Kiểm tra log
docker compose logs -f admin-api mobile-api
```

Lần build đầu tải sbt/npm deps nên chậm (10–20 phút).

## Chạy API bằng `sbt stage`

Mặc định `docker-compose.yml` chạy backend bằng `sbt run` để Play auto-reload khi sửa source. Nếu muốn chạy bản staged distribution giống runtime hơn, dùng file compose riêng:

```bash
# Build và khởi động toàn bộ stack bằng sbt stage
docker compose -f docker-compose.stage.yml up --build -d

# Xem log API
docker compose -f docker-compose.stage.yml logs -f admin-api mobile-api

# Dừng stack stage, giữ nguyên container và volume data
docker compose -f docker-compose.stage.yml stop
```

Trong file này:

- `admin-api` chạy `sbt stage` rồi start `target/universal/stage/bin/rezil-esms-admin-api`.
- `mobile-api` chạy `sbt stage` rồi start `target/universal/stage/bin/rezil-esms-mobile-api`.

Khi code Scala thay đổi, cần restart API để chạy lại `sbt stage`:

```bash
docker compose -f docker-compose.stage.yml restart admin-api mobile-api
```

> Note: Không nên dùng `docker compose down` cho workflow thường ngày vì có thể ảnh hưởng tới container/network đang dùng và dễ thao tác nhầm với `down -v`, làm mất MySQL/MinIO data local. Ưu tiên `stop` hoặc `restart`; chỉ dùng `down` khi thật sự muốn teardown stack.

## Endpoint local

Thêm vào `/etc/hosts` (không cần nếu dùng `nip.io`):

| URL                               | Mô tả                                   |
|-----------------------------------|-----------------------------------------|
| http://rezil.nip.io               | Admin web                               |
| http://rezil.nip.io/api           | Admin API (same-origin proxy)           |
| http://api.rezil.nip.io           | Admin API (direct)                      |
| http://rezil-mobile.nip.io        | Mobile web                              |
| http://rezil-mobile.nip.io/api/v1 | Mobile API (same-origin proxy)          |
| http://api.rezil-mobile.nip.io    | Mobile API (direct)                     |
| http://localhost:8080             | Admin Swagger UI                        |
| http://localhost:8081             | Mobile Swagger UI                       |
| http://localhost:9001             | MinIO console (minioadmin / minioadmin) |
| `localhost:13306`                 | MySQL (rezil / pass)                    |

## Workflow hằng ngày

### Sau khi merge code vào `develop`

Dùng script `./scripts/pull-and-restart.sh` để pull develop từ các repo con và restart dịch vụ liên quan.

#### Cú pháp

```bash
[ENV=value ...] ./scripts/pull-and-restart.sh [TARGET]
```

#### Targets

| Target             | Pull repo                                     | Hành động khi có thay đổi                                                                                           |
|--------------------|-----------------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| `all` *(mặc định)* | rezil-esms, rezil-esms-mobile, rezil-esms-lib | Lib đổi → rebuild image + evict cache. Lib không đổi → chỉ restart admin/mobile (không build).                      |
| `admin`            | rezil-esms                                    | restart admin-api + admin-web, chạy lại `admin-openapi-build`                                                       |
| `mobile`           | rezil-esms-mobile                             | restart mobile-api + mobile-web, chạy lại `mobile-openapi-build`                                                    |
| `lib`              | rezil-esms-lib                                | `docker compose build admin-api mobile-api` → evict cache `jp.co.rezil` → up api → rebuild OpenAPI (admin + mobile) |

> **Vì sao admin/mobile không cần build?** Source code của admin/mobile được bind-mount vào container qua volume `../rezil-esms:/workspace/rezil-esms`. Khi `sbt run` đang chạy bên trong, Play framework tự recompile khi file thay đổi — không cần build image lại. Image chỉ chứa SBT + JDK + lib jar, đều không đổi.
>
> Chỉ khi `rezil-esms-lib` có commit mới mới cần rebuild image (vì lib bake vào qua `publishLocal`). Đó là target `lib`.

#### Biến môi trường

| Biến          | Mặc định  | Tác dụng                                                                       |
|---------------|-----------|--------------------------------------------------------------------------------|
| `BRANCH`      | `develop` | Branch để pull ở cả 3 repo                                                     |
| `FORCE_BUILD` | `0`       | `=1` để ép restart/build dù pull không có commit mới                           |
| `SAFE`        | `0`       | `=1` để tắt auto-reset khi remote bị force-push (script sẽ bail thay vì reset) |

#### Ví dụ

```bash
# Pull cả 3 repo, chỉ restart phần có thay đổi
./scripts/pull-and-restart.sh

# Chỉ pull rezil-esms; nếu có commit mới → restart admin-api + admin-web
./scripts/pull-and-restart.sh admin

# Chỉ pull rezil-esms-mobile
./scripts/pull-and-restart.sh mobile

# Pull rezil-esms-lib; có commit mới mới rebuild image admin-api/mobile-api
./scripts/pull-and-restart.sh lib

# Pull branch khác develop
BRANCH=release/1.2 ./scripts/pull-and-restart.sh

# Ép rebuild lib dù không có commit mới (vd nghi cache hỏng)
FORCE_BUILD=1 ./scripts/pull-and-restart.sh lib

# Ép restart cả admin + mobile (kể cả khi không có thay đổi)
FORCE_BUILD=1 ./scripts/pull-and-restart.sh

# Tắt auto-reset khi develop bị force-push → script báo lỗi để bạn xử tay
SAFE=1 ./scripts/pull-and-restart.sh
```

#### Cơ chế

**Detect thay đổi**: trước khi pull, script lưu `git rev-parse HEAD`. Sau pull/reset, so sánh với HEAD mới. HEAD đổi → set `PULL_CHANGED=1`. Chỉ khi flag bật (hoặc `FORCE_BUILD=1`) script mới restart/rebuild.

**Auto-handle force-push**:
1. `git fetch` rồi kiểm tra `HEAD` có phải ancestor của `origin/<branch>` không.
2. Phải → `git pull --ff-only` (an toàn).
3. Diverge (force-push hoặc local có commit chưa push):
   - Working tree **bẩn** → bail, yêu cầu commit/stash trước.
   - Working tree **sạch** → in commit local sắp mất, rồi `git reset --hard origin/<branch>`.
4. `SAFE=1` để tắt bước 3 — bail thay vì auto-reset.

**Skip rebuild khi lib không đổi**: `lib` và `all` chỉ chạy `docker compose build admin-api mobile-api` + evict cache khi lib có commit mới. Tiết kiệm thời gian build (~3–10 phút).

#### Exit code

- `0` — thành công (cả khi không có thay đổi → skip).
- `≠0` — fail. Các trường hợp phổ biến:
  - Working tree dirty khi cần reset (force-push case).
  - `git fetch` lỗi (mất mạng, không quyền SSH).
  - `SAFE=1` và remote diverge.

### Khi nào cần can thiệp gì

| Thay đổi ở                           | Cần làm                                                                                             |
|--------------------------------------|-----------------------------------------------------------------------------------------------------|
| Code Scala (`be-api/app/**`)         | Play auto-reload. Restart cho chắc: `docker compose restart admin-api`                              |
| Code FE (`app/src/**`)               | Không cần làm gì — Vite HMR                                                                         |
| `package.json` / `package-lock.json` | `docker compose restart admin-web` (chạy lại `npm install`)                                         |
| `build.sbt` / dependency Scala mới   | `docker compose restart admin-api`                                                                  |
| `rezil-esms-lib` (shared)            | `./scripts/pull-and-restart.sh lib` (build lại image + evict cache lib)                             |
| Migration / init SQL                 | Ưu tiên chạy migration/SQL trực tiếp trong MySQL. Chỉ reset volume khi thật sự muốn xóa data local. |
| OpenAPI spec                         | `docker compose up admin-openapi-build` (hoặc `mobile-openapi-build`)                               |

## Lệnh hữu ích

```bash
# Xem log một service
docker compose logs -f admin-api

# Vào shell một service
docker compose exec admin-api bash
docker compose exec mysql mysql -uroot -proot

# Restart riêng
docker compose restart admin-api admin-web

# Dừng toàn bộ (giữ data)
docker compose down

# Dừng và xóa luôn volume (mất MySQL data, MinIO data, node_modules cache)
docker compose down -v

# Rebuild image admin/mobile API (sau khi sửa Dockerfile hoặc rezil-esms-lib)
docker compose build admin-api mobile-api
```

## Cách lib (`rezil-esms-lib`) được tích hợp

`rezil-esms-lib` được "bake" vào image `rezil-esms-sbt-lib:local` qua `sbt publishLocal` (xem `docker/rezil-esms-lib/Dockerfile`). Image này là base của cả `admin-api` và `mobile-api`. Khi lib thay đổi:

1. **Phải rebuild image** — lib jar nằm trong image, không phải bind mount.
2. **Phải evict cache** — `ivy-cache` / `coursier-cache` là named volume tồn tại qua các lần rebuild. sbt cache theo `groupId:artifactId:version`, nên nếu version trùng (thường gặp khi dev local), sbt sẽ dùng jar cũ thay vì re-resolve.

`./scripts/pull-and-restart.sh lib` xử lý đủ cả 2 bước trên: pull source → `docker compose build admin-api mobile-api` → xóa artifact `jp.co.rezil` trong cache → restart api.

**Source `rezil-esms` và `rezil-esms-mobile` không bị touch** trong quá trình này — chỉ container `admin-api` / `mobile-api` restart và compile lại với lib mới. Lib script không pull, không sửa code của hai repo kia, nên các thay đổi đang dở (uncommitted) bên đó vẫn an toàn.

> ⚠ Ngoại lệ: nếu lib mới **đổi/xóa** method, field, hoặc signature mà code admin/mobile đang gọi → `sbt run` sẽ compile fail. Đó là vấn đề code compatibility, dev cần update code admin/mobile cho khớp — không phải vấn đề workflow.

Nếu vẫn nghi ngờ cache → xóa toàn bộ volume (sẽ chậm hơn ~5–10 phút lần `sbt run` kế tiếp do tải lại toàn bộ deps):

```bash
docker compose down admin-api mobile-api
docker volume rm rezil-docker_ivy-cache rezil-docker_coursier-cache rezil-docker_sbt-cache
./scripts/pull-and-restart.sh lib
```

## Database

Stack tạo sẵn 2 schema:

- `rezil_esms` — chính (qua biến `MYSQL_DATABASE`)
- `rezil_esms_inspection` — qua init script `../rezil-esms/etc/docker/env.local/mysql/data/01_mysql_user.sql`

Init script chỉ chạy khi volume `mysql-data` trống. Với thay đổi schema/seed mới, ưu tiên chạy migration hoặc SQL trực tiếp trong MySQL để giữ data. Chỉ reset volume khi thật sự muốn tạo lại database từ đầu vì thao tác đó sẽ xóa MySQL data local.

Auth plugin của user MySQL được force về `caching_sha2_password` qua `etc/mysql/init/02_fix_auth_plugin.sql` (tránh warning `sha256_password is deprecated`). Init script chỉ áp dụng cho volume mới. Với volume đã tồn tại, chạy SQL trực tiếp để sửa mà không mất data:

```bash
docker compose exec mysql mysql -uroot -proot -e "
ALTER USER 'root'@'localhost' IDENTIFIED WITH caching_sha2_password BY 'root';
ALTER USER 'root'@'%'         IDENTIFIED WITH caching_sha2_password BY 'root';
ALTER USER 'rezil'@'%'        IDENTIFIED WITH caching_sha2_password BY 'pass';
FLUSH PRIVILEGES;
"
docker compose restart mysql
```

## CORS

Để tránh CORS giữa web ↔ api, Nginx proxy `/api/` ngay trên cùng domain của web (`rezil.nip.io/api`, `rezil-mobile.nip.io/api/v1`). FE được cấu hình gọi same-origin qua `PUBLIC_API_ENDPOINT` / `VITE_API_BASE_URL` trong `docker-compose.yml`.

## Troubleshooting

- **Port đã chiếm**: đổi mapping ports trong `docker-compose.yml` (cột bên trái của `host:container`).
- **MySQL warning `sha256_password`**: volume cũ có thể vẫn giữ auth plugin cũ vì init script không chạy lại. Chạy block `ALTER USER ... caching_sha2_password` ở phần Database; không dùng `down -v` nếu cần giữ data.
- **`npm install` rất chậm**: do volume `admin-node-modules` / `mobile-node-modules` được mount cache; lần đầu chậm, lần sau nhanh.
- **API không thấy code mới**: Play auto-reload đôi khi miss; `docker compose restart admin-api`.
- **Nginx 502 Bad Gateway sau khi restart api**: nginx cache upstream IP lúc startup. Khi container api được recreate, IP mới → 502. Fix: `docker compose restart nginx`. Script `pull-and-restart.sh` đã tự làm việc này sau mỗi lần build/restart api.
