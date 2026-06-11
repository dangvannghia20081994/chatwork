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
2. Fill PR body from `templates/pr_template.md` (Ticket URL, AI Usage %, full checklist).
3. Set base = `develop`. Title = `[<phase>] <SCREEN-CODE> | REZIL-XXXX - <summary>` (phase `[PreUAT-MVP2-A]` for `develop`, `[Sprint NN]` for `feature/mvp2-b`).
4. Link the Jira ticket.
5. Request review. **Do not merge. Do not force push.**

## Output
- PR link
