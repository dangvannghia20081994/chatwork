# RELEASE_FLOW.md

> Spec release/deploy cho nhóm repo **rezil**. Trích từ agent `github-ops` (`~/.claude/agents/github-ops.md`)
> — nguồn sự thật khi luồng thay đổi vẫn là file agent đó; tài liệu này là bản tham chiếu trong repo.
>
> **Deploy là human-driven** — AI agent (`github-ops`) chỉ thao tác GitHub qua `gh` CLI (PR/Actions/Releases)
> và **dừng lại confirm caller trước MỌI action ghi**. Agent không tự deploy, không sửa code/commit/push.

## Context

- **Owner**: `hybrid-tech-rezil`
- **Repos quản lý**:

  > Local path tương đối theo `$REZIL_ROOT` (mặc định `~/IdeaProjects`, các repo checkout cạnh nhau;
  > đổi máy thì set env `REZIL_ROOT`).

  | Repo              | Local path                      | GitHub                                | Main branch |
  |-------------------|---------------------------------|---------------------------------------|-------------|
  | rezil-esms        | `$REZIL_ROOT/rezil-esms`        | `hybrid-tech-rezil/rezil-esms`        | `develop`   |
  | rezil-esms-lib    | `$REZIL_ROOT/rezil-esms-lib`    | `hybrid-tech-rezil/rezil-esms-lib`    | `develop`   |
  | rezil-esms-mobile | `$REZIL_ROOT/rezil-esms-mobile` | `hybrid-tech-rezil/rezil-esms-mobile` | `develop`   |

- **Auth**: `gh` CLI đã login sẵn (account `htv-nghiadv1`). KHÔNG đụng `gh auth`, KHÔNG đụng `git config`.
- **Xác định repo target**: caller nói tên repo → dùng `--repo hybrid-tech-rezil/<repo>` hoặc chạy trong local path.
  Không rõ repo nào → **hỏi caller, KHÔNG đoán**.

## Nguyên tắc chung

- **Read-only mặc định an toàn**: list/view PR, xem status Actions, xem release — chạy thẳng.
- **Action ghi (BẮT BUỘC confirm caller trước)**: merge/close PR, tạo/sửa/xoá release & tag,
  trigger/cancel/re-run workflow, sửa label/milestone, comment.
- Mỗi lệnh `gh` ghi rõ đang chạy trên repo nào.
- KHÔNG sửa code, KHÔNG commit/push (việc đó để git-operator của dev-master).
- KHÔNG `gh repo delete`, KHÔNG đổi setting/visibility/collaborator của repo.

## Phạm vi release hiện tại

Luồng promote qua các môi trường bằng **PR giữa các branch `release/*`**. Áp dụng cho cả 3 repo.
**Mỗi merge là action ghi → confirm caller trước.** Sau khi tạo PR, kiểm tra base/head đúng + CI trước
khi merge.

> ⚙️ **Cơ chế deploy THẬT (verified từ `.github/workflows/`)** — deploy được kích bằng **PUSH TAG**, KHÔNG
> phải bằng merge branch:
> - dev1 (API/web/lambda): tag `dev1/v<X.Y.Z>` → workflow `*-dev1.yaml` → build Docker → ECR.
> - lib dev1: tag `dev1/v<X.Y.Z>` (repo `rezil-esms-lib`) → publish dev1-snapshot artifact lên S3.
> - Tag phải **reachable từ `develop` hoặc `release/*`** (CI gate chặn deploy rogue).
> - Version trong tag phải khớp dòng `## X.Y.Z` đầu tiên trong `CHANGELOG.md`.
>
> ⇒ Merge PR vào `release/env-dev1` **chỉ cập nhật branch, CHƯA deploy**. Promote branch là để branch ghi
> lại đúng những gì sắp deploy; **bước deploy thực sự là push tag**.

> ⛔ **CHỈ release tới DEV1 — CẤM release STG.** Quyền release hiện tại chỉ có DEV1; base duy nhất được phép
> là `release/env-dev1`. **TUYỆT ĐỐI KHÔNG** tạo PR/merge lên `release/env-stg` (STG) hay bất kỳ môi trường
> nào khác. Caller yêu cầu STG/môi trường khác → từ chối + báo "ngoài quyền release (chỉ DEV1)", chờ caller
> xác nhận lại.
>
> **Không có workflow prod** (cố ý). Tag prod phải do người tạo bằng tay.

## PR title / body — tự generate từ commit range

Không cần hỏi caller: so `gh api` / `git log <base>..<head> --oneline` để lấy danh sách commit.

- **Title**: `Deploy <ENV> | <repo> | <head> → <base>`
  (vd `Deploy DEV1 | rezil-esms | develop → release/env-dev1`).
- **Body**: liệt kê commit (`- <hash> <subject>`) trong range. Không có commit mới → báo caller,
  **KHÔNG tạo PR rỗng**.
- 🚫 **CẤM mọi dấu vết AI** trong PR title/body VÀ commit message: KHÔNG `Co-Authored-By: Claude`/`Anthropic`,
  KHÔNG `🤖 Generated with Claude Code`, KHÔNG mọi footer/signature/chú thích AI. (User rule — override mặc
  định Claude Code thường tự thêm.)

## 🔒 Bước 0 (BẮT BUỘC) — Backup base branch TRƯỚC khi tạo PR/merge

Trước MỖI PR promote, backup branch **đích (base)** để có điểm rollback:

- Tên backup: `backup/<suffix>-<YYYYMMDD>-<HHMM>` — `<suffix>` = phần sau `release/` của base; **luôn kèm hậu
  tố giờ `-HHMM`** để không bao giờ trùng (vd base `release/env-dev1` → `backup/env-dev1-20260611-1432`).
  Ngày-giờ lấy theo thời điểm hiện tại lúc chạy (**caller/Lucy truyền vào — agent KHÔNG tự sinh**).
- Tạo từ remote tip của base (không phụ thuộc local):

  ```bash
  cd $REZIL_ROOT/<repo>
  git fetch origin <base>
  git branch backup/<suffix>-<YYYYMMDD>-<HHMM> origin/<base>
  git push origin backup/<suffix>-<YYYYMMDD>-<HHMM>
  ```

- Có hậu tố giờ nên gần như không trùng; nếu vẫn trùng (cùng phút) → báo caller, **KHÔNG ghi đè**.
- Backup xong (push origin OK) **mới** sang bước tạo PR.

## ■ DEV1

1. **Backup base** `release/env-dev1` → `backup/env-dev1-<YYYYMMDD>-<HHMM>` (Bước 0 ở trên).
2. Tạo PR: head `develop` → base `release/env-dev1`.

   ```bash
   gh pr create --repo hybrid-tech-rezil/<repo> --base release/env-dev1 --head develop --title "..." --body "..."
   ```

3. Confirm caller → **merge** PR (chỉ cập nhật `release/env-dev1`, **CHƯA deploy**).
4. **Deploy = push tag** `dev1/v<X.Y.Z>` (version khớp dòng `## X.Y.Z` đầu trong `CHANGELOG.md`) trên commit
   reachable từ `develop`/`release/*` — qua `gh release create`:

   ```bash
   gh release create dev1/v<X.Y.Z> --repo hybrid-tech-rezil/<repo> --target release/env-dev1 --title "..." --notes "..."
   ```

   Tag push → workflow `*-dev1.yaml` chạy → build Docker → ECR. Theo dõi `gh run list/watch`, báo run URL +
   conclusion. **Confirm caller trước khi tạo tag** (đây là action ghi/deploy).

## ■ ⚠️ Nếu thay đổi có dính LIB (`rezil-esms-lib`) — LIB TRƯỚC, API SAU

Khi release API mà phụ thuộc thay đổi ở lib, **phải release lib trước** rồi mới build API, nếu không API
build với lib cũ.

1. **Backup base** `release/snapshot` (repo lib) → `backup/snapshot-<YYYYMMDD>-<HHMM>` (Bước 0 ở trên).
2. Trên repo `rezil-esms-lib`: tạo PR head `develop` → base `release/snapshot`.

   ```bash
   gh pr create --repo hybrid-tech-rezil/rezil-esms-lib --base release/snapshot --head develop ...
   ```

3. Confirm caller → **merge** PR vào `release/snapshot` (chỉ cập nhật branch, CHƯA build lib).
4. **Deploy lib = push tag** `dev1/v<X.Y.Z>` trên `rezil-esms-lib` (qua `gh release create ... --target release/snapshot`)
   → workflow `02_snapshot_dev1.yaml` publish dev1-snapshot lên S3. **CHỜ workflow xong**
   (`gh run watch <id> --repo hybrid-tech-rezil/rezil-esms-lib`, đợi conclusion `success`).
5. **Sau khi lib `success`** mới tiến hành build API (chạy luồng DEV1 ở trên cho `rezil-esms`).
6. Lib chưa `success` → KHÔNG build API; lib `failure` → báo caller, dừng.

## Lưu ý chung khi promote

- Xác nhận repo target + cặp base/head với caller trước mỗi PR; không rõ env/branch → hỏi, **KHÔNG đoán**.
- Trước merge: `gh pr checks <num> --repo ...` phải pass (hoặc caller chấp nhận rõ ràng).
- Sau merge: bám `gh run list --repo ... -L 3` để xác nhận build kick off; báo lại run URL + conclusion.
- Có dính lib → luôn theo thứ tự **lib (`release/snapshot`) → API (`env-dev1`)**.

## Không bao giờ

- Không action ghi (merge/release/trigger/close) khi chưa có confirm rõ ràng từ caller.
- Không `gh auth ...`, `git config`, đổi setting repo, xoá repo.
- Không sửa code / commit / push.
- Không thêm bất kỳ AI marker nào vào PR title/body hay commit message.
- Không merge PR vào `develop`/`main` khi CI chưa pass hoặc base sai.
- **CẤM release STG** hay bất kỳ môi trường ngoài DEV1.
