# RELEASE_FLOW.md

> Spec release/deploy cho nhóm repo **rezil**. Trích từ agent `github-ops` (`~/.claude/agents/github-ops.md`,
> cũng tracked tại `.claude/agents/github-ops.md`) — **nguồn sự thật khi luồng thay đổi vẫn là file agent đó**;
> tài liệu này là bản tham chiếu trong repo. Lệch nhau → tin file agent.
>
> **Deploy là human-driven** — AI agent (`github-ops`) chỉ thao tác GitHub qua `gh`/`git` CLI (PR/Actions/Releases,
> nhánh release + tag) và **DỪNG lại confirm caller trước MỌI action ghi**. Agent không tự deploy, không sửa code nguồn.

## Context

- **Owner**: `hybrid-tech-rezil`
- **Repos quản lý** (local path tương đối theo `$REZIL_ROOT`, mặc định `~/IdeaProjects`; đổi máy thì set env `REZIL_ROOT`):

  | Repo              | GitHub                                | Main branch | Version | Ghi chú |
  |-------------------|---------------------------------------|-------------|---------|---------|
  | rezil-esms-lib    | `hybrid-tech-rezil/rezil-esms-lib`    | `develop`   | `0.3.x` | LIB — tag **TRƯỚC**; base `develop` |
  | rezil-esms        | `hybrid-tech-rezil/rezil-esms`        | `develop`   | `0.3.x` | admin (gồm module `be-lambda`) |
  | rezil-esms-mobile | `hybrid-tech-rezil/rezil-esms-mobile` | `develop`   | `0.3.x` | mobile |
  | rezil-esms-portal | `hybrid-tech-rezil/rezil-esms-portal` | `develop`   | `0.3.x` | cùng số version với 3 repo kia; **CHƯA có pipeline dev1** → chỉ quản PR/CI, KHÔNG tag-deploy |

  - **version-sync group** = lib + admin + mobile + portal → **DÙNG CHUNG số `X.Y.Z`** (đồng bộ từ `0.3.0`, 2026-07-27).
    portal chung số nhưng **KHÔNG tag-deploy** (chưa có pipeline) → mọi đợt release vẫn chỉ tag 3 repo lib → admin → mobile.

- **Auth**: `gh` CLI đã login sẵn (account `htv-nghiadv1`). KHÔNG đụng `gh auth`, KHÔNG đụng `git config`.
- **Xác định repo target**: caller nói tên repo → `--repo hybrid-tech-rezil/<repo>` hoặc chạy trong local path.
  Không rõ repo nào → **hỏi caller, KHÔNG đoán**.

## Nguyên tắc chung

- **Read-only mặc định an toàn**: list/view PR, xem status Actions, xem release — chạy thẳng.
- **Action ghi (BẮT BUỘC confirm caller trước)**: push nhánh/tag, `git tag -f`, merge/close PR, tạo/sửa/xoá
  release & tag, trigger/cancel/re-run workflow, sửa label/milestone, comment.
- Mỗi lệnh `gh`/`git` ghi rõ đang chạy trên repo nào; làm xong báo run URL + conclusion.
- KHÔNG sửa code nguồn / commit code mới. **Ngoại lệ hợp lệ phục vụ deploy**: tạo nhánh release dated, cherry-pick
  commit đã có, đồng bộ `CHANGELOG.md`, push nhánh + tag.
- KHÔNG `gh auth`, `git config`, đổi setting/visibility/collaborator, `gh repo delete`.
- **Jira CHỈ ĐỌC** (JQL dựng danh sách ticket release) — không comment/transition/edit (việc đó của jira-master).
- 🚫 **CẤM mọi dấu vết AI** trong commit/PR title/body: KHÔNG `Co-Authored-By: Claude`/`Anthropic`,
  KHÔNG `🤖 Generated with Claude Code`, KHÔNG footer/signature AI. (User rule — override mặc định Claude Code.)

## Phạm vi release hiện tại

- ✅ **Được release DEV1 và STG.** DEV1 confirm trước mọi action ghi (như mọi luồng). **STG BẮT BUỘC hỏi/confirm
  caller trước khi push tag** — tóm tắt sẽ tag repo/version/nhánh gì rồi mới chạy, KHÔNG tự động.
- ⛔ **CẤM prod** (tag `v<X.Y.Z>` không prefix, workflow lib `01_release.yaml`) và mọi môi trường ngoài dev1/stg.
- **Không có workflow prod cho agent** (cố ý). Tag prod phải do người tạo bằng tay.
- ⛔ **KHÔNG release portal** (`rezil-esms-portal`). portal chưa có pipeline `*-dev1.yaml`/`*-stg.yaml` → không tag-deploy;
  chỉ quản PR/CI. **Mọi đợt release (dev1/stg) chỉ gồm 3 repo version-sync: lib → admin → mobile.**

> ✅ **Cơ chế deploy THẬT**: deploy kích bằng **PUSH TAG**, KHÔNG phải merge branch. Tag `dev1/v<X.Y.Z>` →
> workflow `*-dev1.yaml`; tag `stg/v<X.Y.Z>` → workflow `*-stg.yaml` → build → deploy. portal chưa có
> `*-dev1.yaml`/`*-stg.yaml` nên không tag-deploy được.
>
> ❌ **Đã BỎ (deprecated từ 2026-06-11)**: nhánh persistent `release/env-dev1` / `release/snapshot`;
> promote-PR `develop → release/env-*`; **backup base branch**. Thay bằng: mỗi đợt cut **nhánh release DATED mới** —
> nhánh đó CHÍNH LÀ snapshot bất biến, nhánh đợt trước vẫn còn trên origin làm điểm rollback nên KHÔNG cần backup.

## Khái niệm

- **Version** = dòng đầu `CHANGELOG.md` (`## X.Y.Z - YYYY-MM-DD`). Version build lấy từ dòng này, **KHÔNG** từ tên tag.
- **DEV1 và STG là 2 dòng version ĐỘC LẬP — KHÔNG liên quan nhau.** Mỗi lần release 1 môi trường: version mới = **tăng
  từ version của lần release GẦN NHẤT của chính môi trường đó** (không nhìn sang môi trường kia, không bắt buộc khớp
  `develop`). VD: dev1 vừa ở `0.2.10` → dev1 tiếp theo `0.2.11`; stg đang ở `0.2.11` là dòng RIÊNG. Trong CÙNG 1 môi
  trường, nhóm version-sync (lib/admin/mobile) vẫn DÙNG CHUNG số.
- **Bump version là THỦ CÔNG** (dev commit `chore: bump version to X.Y.Z` trên `develop` sau mỗi đợt). CI **KHÔNG** tự
  bump — github-ops chỉ tag/deploy, không bump.
- **Nhánh release**: `release/dev1/v<X.Y.Z>/<YYYYMMDD>` (trùng tên cùng ngày → hậu tố `-2`, `-3`).
  **Ngày do caller cấp — agent KHÔNG tự sinh.**
- **Deploy tag**: `dev1/v<X.Y.Z>`. Push tag = kích CI build/deploy.
- **THỨ TỰ**: tag/deploy **lib TRƯỚC** → đợi CI lib publish snapshot (`X.Y.Z-dev1-SNAPSHOT`) `success` → rồi
  **admin + mobile** (song song được).
  - Consumer của lib gồm **cả `be-lambda`** (module sbt trong repo admin, build/deploy riêng) lẫn `be-api` và mobile.
    Lib chưa publish version mới → admin (gồm lambda) + mobile fail ngay bước `update`
    (`Error downloading jp.co.rezil:rezil-esms_3:X.Y.Z-SNAPSHOT … Not found`). Đây là **build-order** (lib chưa
    publish), KHÔNG phải lỗi code — re-publish lib version đó trước rồi re-run build. (Sự cố REZIL-2709 2026-06-27.)

## ■ DEV1 — SUBSET cherry-pick thủ công (dùng KHI `develop` còn ticket NGOÀI scope dev1 — ĐỐI CHIẾU danh sách ticket caller cấp, KHÔNG giả định)

`develop` còn ticket NGOÀI scope dev1 → KHÔNG cut thẳng nhánh release từ `develop`. Mỗi đợt:

1. `git fetch --all --prune --tags` cả 4 repo.
2. Base mỗi repo = **nhánh release dev1 MỚI NHẤT của chính nó**:
   `git -C <repo> branch -r | grep 'release/dev1' | sort -V | tail`. Các repo có thể lệch số — đừng giả định cùng số.
3. Tìm commit IN-SCOPE trên `develop` chưa có trong base, theo DANH SÁCH TICKET caller cấp. `develop`
   đã rebase nhiều lần → xác định bằng `git cherry` / so SUBJECT + nội dung patch, **KHÔNG** dùng range-hash
   `tag..develop` (phồng 3–5×). Subject đã có trong base + patch trùng → BỎ (đã release dưới hash khác).
   - **Commit KHÔNG mang key ticket vẫn phải xét** (`hotfix:`, migration, `*.conf`/`application*.yml`,
     workflow CI). Trong `rezil-esms` các commit `hotfix:` thường không có `REZIL-XXXX` trong subject lẫn
     body (vd `d0c42ee9a hotfix: Correct the migration file order`, `32eb30486 hotfix: Set the Google Maps
     API key for the stg admin app`) — lọc thuần theo danh sách ticket sẽ bỏ sót, deploy ra env sai config
     hoặc migration chạy sai thứ tự. Quyết bằng PATCH, không bằng việc có key ticket hay không.
4. LOẠI commit ngoài scope + commit KHÔNG đổi hành vi: reformat-only / scalafmt, `chore:` bump-version,
   `docs:` chỉ đụng `.md`. **Quyết bằng `git show <sha> --stat`, KHÔNG quyết bằng prefix subject** — prefix
   trong repo đặt không đồng nhất. Chạm `.scala` / `.ts` / `.svelte` / `.conf` / `application*.yml` /
   migration / workflow CI → LẤY. Còn nghi ngờ → LẤY rồi build-check ở bước 5 (thừa 1 commit vô hại an toàn
   hơn thiếu 1 fix; DEV1 không back-merge nên commit bỏ sót nằm lại `develop` tới đợt sau).
5. `git checkout -B release/dev1/v<X.Y.Z>/<YYYYMMDD> <base>` → `git cherry-pick <sha...>` đúng thứ tự cũ→mới;
   conflict → resolve tay. Build-check (`sbt compile` / `npm run build`) trước khi push.
6. Push nhánh release (CHƯA kích CI — an toàn): `git push -u origin HEAD`.

## ■ DEV1 — full (KHI `develop` đã đúng bằng scope dev1)

Cut thẳng nhánh dated từ tip `origin/develop`, push nhánh, rồi tag (bỏ bước cherry-pick chọn lọc ở trên).

## ■ TRƯỚC KHI TAG (BẮT BUỘC)

So dòng đầu `CHANGELOG.md` của **lib/admin/mobile** (nhóm version-sync) phải CÙNG `X.Y.Z` và KHỚP số sẽ dùng trong
tag (portal cùng số nhưng không tag-deploy → chỉ bump trên `develop`). Lệch → DỪNG, đồng bộ CHANGELOG (mang từ nhánh chuẩn sang) rồi mới
tag. **Subset KHÔNG bump version** (chỉ đổi date + append ticket dưới `### Changed`).

**Commit message CHANGELOG (BẮT BUỘC)**: đúng 1 dòng `chore: update CHANGELOG for X.Y.Z` (X.Y.Z = version của đợt,
không prefix tag, không ngày, không chữ `v`), không body, không Co-Authored-By, không AI marker. CẤM biến thể tự đặt
(`docs(changelog): update for X.Y.Z`, `Update changelog vX.Y.Z`, `Sync X.Y.Z`, `REZIL-XXXX - Update CHANGELOG ...`) —
history có nhiều style cũ, KHÔNG copy theo. Commit bump trên `develop`: `chore: bump version to X.Y.Z`.

## ■ TAG / DEPLOY (kích CI — CONFIRM caller trước, đúng thứ tự lib → admin/mobile)

Ở tip nhánh release đã push:

```bash
git tag dev1/v<X.Y.Z> <nhánh-release>
git push origin refs/tags/dev1/v<X.Y.Z>
# Tag đã tồn tại → force CHỈ TAG (sau confirm):
git tag -f dev1/v<X.Y.Z> <nhánh-release>
git push --force origin refs/tags/dev1/v<X.Y.Z>
```

- Force-push được cho **TAG** (`refs/tags/...`) và **nhánh release** (`release/*`) khi cần (sau confirm). **TUYỆT ĐỐI KHÔNG force-push `develop`/`main`.**
- Force-push tag có thể không tự trigger CI → vào GitHub Actions re-run thủ công nếu cần
  (`gh run rerun <id> --repo ...`). Theo dõi: `gh run list/watch`.
- Lib phải `success` mới tag admin/mobile; lib `failure` → báo caller, dừng.

## ■ Sau tag

CI build + deploy. **DEV1 KHÔNG auto back-merge về `develop`**: app BE (`be-api-*` admin+mobile) đã GỠ back-merge
(`after-release.sh` bị xoá — `rezil-esms@4fa819c5`, `rezil-esms-mobile@f42629f3`), còn lib snapshot
(`02_snapshot_dev1`) vốn không back-merge. **Chỉ lib prod `01_release.yaml` (tag `v<X.Y.Z>`) mới back-merge** — mà đó
là prod, ngoài quyền release DEV1.

⇒ Không có gì tự đồng bộ tag DEV1 về `develop`. LUÔN cherry-pick từ `develop` để `develop` giữ superset; nếu có fix
cắm thẳng nhánh release thì phải tự merge về `develop` (báo caller). *(Verify-branch gate vẫn bắt tag phải reachable
từ `develop`/`release/*` nên không cut được tag từ nhánh lạ.)*

## ■ STG (ĐƯỢC PHÉP — CONFIRM caller trước mỗi lần)

STG là dòng release RIÊNG, **version ĐỘC LẬP với DEV1** (tăng từ lần release STG gần nhất, KHÔNG lấy theo dev1/`develop`).
Nhánh release RIÊNG `release/stg/v<X.Y.Z>/<YYYYMMDD>`, prefix tag `stg/` (thay vì `dev1/`), workflow `*-stg.yaml`
(thay vì `*-dev1.yaml`). Toàn bộ bước cut nhánh / cherry-pick / đồng bộ CHANGELOG y hệt DEV1, chỉ khác **số version**.

- **Deploy tag**: `stg/v<X.Y.Z>` (regex `stg/v[0-9]+.[0-9]+.[0-9]+`). Trigger:
  - lib: `03_snapshot_stg.yaml` → publish snapshot **suffix `-stg`** (`X.Y.Z-stg-SNAPSHOT`), coexist với snapshot dev1 cùng version trên S3.
  - admin: `be-api-stg.yaml`, `be-lambda-stg.yaml`, `web-stg.yaml`. *(comment header `be-lambda-stg.yaml` ghi nhầm "dev1" — filter tag thật là `stg/v*`.)*
  - mobile: `be-api-stg.yaml`, `app-stg.yaml`.
  - portal: **chưa có `*-stg.yaml`** → không tag-deploy stg.
- **Verify-branch**: tag phải reachable từ `develop` HOẶC nhánh `release/*` → nhánh `release/stg/*` qua được.
- **THỨ TỰ y hệt dev1**: lib TRƯỚC → đợi CI lib publish `X.Y.Z-stg-SNAPSHOT` `success` → admin + mobile (song song). Lib `failure` → dừng, báo caller.

```bash
# CHỈ chạy SAU khi caller confirm (tóm tắt repo/version/nhánh/tag trước):
git tag stg/v<X.Y.Z> <nhánh-release>
git push origin refs/tags/stg/v<X.Y.Z>
# Tag đã tồn tại → force CHỈ TAG (sau confirm):
git tag -f stg/v<X.Y.Z> <nhánh-release>
git push --force origin refs/tags/stg/v<X.Y.Z>
```

- STG **không** back-merge về `develop` (như dev1).
- **BẮT BUỘC**: trước khi push tag `stg/v*` → tóm tắt cho caller (repo/version/nhánh/tag) và chờ xác nhận. Không tự động.

## Không bao giờ

- Không action ghi (push/merge/release/trigger/close) khi chưa có confirm rõ ràng từ caller.
- Không `gh auth`, `git config`, đổi setting repo, xoá repo.
- Không sửa code nguồn / commit code mới (ngoài thao tác git phục vụ release nêu trên).
- Không thêm bất kỳ AI marker nào vào PR title/body hay commit message.
- Không merge PR vào `develop`/`main` khi CI chưa pass hoặc base sai.
- **Không force-push `develop`/`main`** (nhánh `release/*` và tag được force khi cần, sau confirm).
- **Release STG mà chưa confirm caller** — STG được phép nhưng phải hỏi/xác nhận trước mỗi lần push tag `stg/v*`.
- **CẤM release prod** (tag `v<X.Y.Z>` không prefix) hay bất kỳ môi trường ngoài dev1/stg.
