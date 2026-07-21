# Prompt: Create PR

## Goal
Open a pull request for a completed change. NEVER merge — human reviews and merges.

## Input
- Branch name (must follow `<type>/YYYY-MM-REZIL-XXXX-<SCREEN-CODE>`)
- Repo (`rezil-esms` default / `-lib` / `-mobile`)
- Related Jira ticket + AI usage % + SCREEN-CODE

## Preconditions (all must hold)
- [ ] Tests pass
- [ ] Build passes
- [ ] Code quality passes — BE `sbt scalafmtCheckAll "scalafix --check"`, FE `npm run check`
- [ ] Security passes — `./semgrep-rules/scan.sh`

## Steps
1. Ensure branch is pushed and rebased/up to date with `develop`.
2. PR body = **EXACTLY** nội dung `templates/pr_template.md`, chỉ điền placeholder (Ticket URL, AI Usage %, tick các ô checklist đã thực sự pass). KHÔNG thêm/bớt/đổi thứ tự section, KHÔNG append summary / change list / test plan / footer "Generated with" / emoji. Dùng `gh pr create --body-file <file template đã điền>` (KHÔNG dùng `--body` với text tự gõ).
3. Set base = `develop`. Title = `[<phase>] <SCREEN-CODE> | REZIL-XXXX - <summary>`. Phase LẤY TỪ TICKET — tag `[...]` ở đầu summary ticket (chuẩn hoá bỏ khoảng trắng thừa, vd `[PreUAT- MVP2-A]` → `PreUAT-MVP2-A`); nếu summary không có tag phase → để `UAT-MVP2-A`.
4. Link the Jira ticket.
5. Request review. **Do not merge. Do not force-push `develop`/`main`** (force-push nhánh PR của mình được nếu cần).

## Output
- PR link
