# WORKFLOW

## Input
- Jira ticket key — e.g. `REZIL-2352`
- Screen code — e.g. `ISSUE-001` (for branch + PR title)
- Repo (optional) — `rezil-esms` (default) / `rezil-esms-lib` / `rezil-esms-mobile`

## Steps
1. **Read Jira** — understand requirement; note the **issue type** (Bug / Task / RoC / ...). Stop & ask if ambiguous.
2. **Sync base** — `git checkout develop && git pull --ff-only`.
3. **Create branch** — `<type>/YYYY-MM-REZIL-XXXX-<SCREEN-CODE>`.
   `type` is auto-mapped from the Jira issue type (Bug→`bug`, RoC→`roc`, Task→`feature`, ... see `config/jira.json`). `scripts/fix-ticket.js REZIL-XXXX SCREEN-CODE --issue-type="Bug"`.
4. **Analyze code** — trace the relevant path: LIB (domain/validation/business rule/mapper in `rezil-esms-lib`) → BE (controller→service→repo) → FE (component→store→api). Domain/business rules live in LIB, not in controllers — if the root cause is a domain/validation rule, fix it in LIB.
5. **Implement** — minimal change, reuse existing patterns, no unrelated refactor.
   ↳ **Schema/data change?** Tạo migration theo `templates/migration.md` — BẮT BUỘC sinh file bằng `./etc/scripts/new-migration.sh <db> <folder> "<desc>"` (tên `V<YYYYMMDDHHMMSS>__<desc>.sql`), chọn `db` = `esms`/`inspection`, `folder` = `common` (mặc định) hoặc `env-*`. KHÔNG gõ tay version, KHÔNG sửa migration đã apply.
6. **Code quality** — BE `sbt scalafmtCheckAll "scalafix --check"`; FE `npm run check`.
7. **Run tests + build**.
8. **Security** — `./semgrep-rules/scan.sh`.
   ↳ If any of 6/7/8 fail: **stop, report, do NOT create PR**.
9. **Commit** — `REZIL-XXXX - <summary>`.
10. **Push** — `origin <branch>` (force-push nhánh của mình được nếu cần; **KHÔNG force-push `develop`/`main`**).
11. **Create PR** — base `develop`; title `[<phase>] <SCREEN-CODE> | REZIL-XXXX - <summary>`; body = **đúng nguyên `templates/pr_template.md`**, chỉ điền placeholder (Ticket URL, AI Usage %, tick checklist) — KHÔNG thêm summary/change list/test plan/footer. Dùng `--body-file`. `scripts/create-pr.js`.
12. **Update Jira** — comment via `templates/jira_comment.md` (PR link + phạm vi ảnh hưởng).

## Human Gate
- AI stops after PR creation. **Never merges.**
- Human reviews and merges.
- **Deploy is out of scope for the agent** — all deploys (dev1/stg/prod) are human-driven per `RELEASE_FLOW.md`.
