# Prompt: Fix Bug

## Goal
Fix a bug from a Jira ticket with a safe, minimal change. Correctness over creativity.

## Input
- Jira ticket key (e.g. REZIL-XXXX)
- Repo (default `rezil-esms`; also `rezil-esms-lib`, `rezil-esms-mobile`)
- Reproduction steps / expected vs actual

## Steps
1. **Read Jira** ticket; confirm requirement. Stop & ask if ambiguous.
2. **Sync** base: `git checkout develop && git pull`.
3. **Branch**: `<type>/YYYY-MM-REZIL-XXXX-<SCREEN-CODE>` — `type` auto-mapped from Jira issue type (Bug→`bug`, RoC→`roc`, Task→`feature`...; see config/jira.json). E.g. `bug/2026-06-REZIL-2352-ISSUE-001`.
4. **Locate root cause** — trace controller/route → service → repository (BE Scala) or component → store → api (FE Svelte).
5. **Implement** the minimal fix. Reuse existing patterns; no unrelated refactor.
6. **Code quality** (must pass):
   - BE: `sbt scalafmtCheckAll "scalafix --check"`
   - FE: `npm run check`
7. **Tests + build**. If anything fails → stop, report, do NOT open PR.
8. **Security**: `./semgrep-rules/scan.sh`.
9. **Commit**: `REZIL-XXXX - <summary>` (see templates/commit_message.md).
10. **Push** + open PR (templates/pr_template.md). Never merge.
11. **Update Jira** (templates/jira_comment.md).

## Output
- Branch + PR link
- Root cause + fix summary
- Test/build/quality results
