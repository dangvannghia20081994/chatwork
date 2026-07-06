# WORKFLOW_FEATURE

> The **Feature** workflow: BD + Figma → spec → testcase → OpenAPI/Aspida → Scala LIB/BE → Svelte FE → test → review → PR.
> This is the design-first, testcase-first, contract-first flow for building a **new feature** on the REZIL stack.
> For a quick bug fix / small change use the **Fix-Bug** workflow (`WORKFLOW.md`) instead.

## Input
- Jira ticket key — e.g. `REZIL-2352` (Claude reads it + its remote links for BD/Figma).
- BD + Figma **context** — pasted BD text, Figma link(s), or repo-relative path(s) to a BD doc. Headless `claude -p` cannot open a Figma file behind auth — it consumes pasted text / fetchable links / screenshots only.
- Repo(s) — `rezil-esms` (default, full-stack) / `rezil-esms-lib` (shared Scala) / `rezil-esms-mobile`.

## Principles (hard)
- **Design-first**: never generate code before BD analysis exists.
- **Mapping-first**: never generate UI before Figma is mapped to BD.
- **Contract-first**: OpenAPI is the BE↔FE contract. Changing it forces updating BE, FE, Aspida client and tests together.
- **No invention**: never invent API, field, business rule, validation or UI. If info is missing → record an **Assumption** (or hit the INFO GATE).
- **No hardcoded API in FE** when Aspida is in use.
- Domain/business rules live in LIB, not in controllers.
- Only touch files in scope. Always create/update tests alongside code.

## Artifacts (audit trail — NOT committed)
Each phase writes its output to `.ai-agent/generated/NN-*.md` in the **target repo working tree**:
- These are the durable state read back across phases and the substitute for human phase-gates.
- They are **git-ignored** (add `.ai-agent/` to `.git/info/exclude` for the run); do **not** commit them.
- The PR body carries only a **digest** (Phase 15 review summary + Phase 12/13 test results), not the raw files.

## Phases
| # | Phase | Output (`.ai-agent/generated/`) |
|---|---|---|
| 0 | Intake | `00-task-intake.md` |
| 1 | Read BD | `01-bd-analysis.md` |
| 2 | Extract structured spec | `02-structured-spec.md` |
| 3 | Generate UT cases | `03-ut-testcases.md` |
| 4 | Select IT cases | `04-it-testcases.md` |
| 5 | Read Figma | `05-figma-analysis.md` |
| 6 | Map BD ↔ Figma | `06-bd-figma-mapping.md` |
| 7 | OpenAPI contract | `07-openapi-plan.md` + `openapi.yaml` |
| 8 | Aspida client | `08-aspida-report.md` + generated client |
| 9 | Scala LIB | `09-lib-implementation-plan.md` + LIB code/test |
| 10 | Scala BE | `10-be-implementation-plan.md` + BE code/test |
| 11 | Svelte FE | `11-fe-implementation-plan.md` + FE code/test |
| 12 | UT impl + run | `12-ut-result.md` |
| 13 | IT impl + run | `13-it-result.md` |
| 14 | Build / Lint / Typecheck | `14-quality-check.md` |
| 15 | Review diff | `15-review-summary.md` |
| 16 | PR / ticket update | `16-pr.md` |

## INFO GATE (check at Phase 0–1, BEFORE writing any code)
After reading the ticket + remote links + the pasted context, judge whether there is **enough** to build safely.
If NOT — e.g. no usable BD, no acceptance criteria, Figma absent and UI undetermined, cannot scope the target repo —
then **do NOT create a branch and do NOT edit anything**. Output a block starting with the exact token
`⛔ NEED-INFO:` listing what is missing, then STOP. Take no mutating actions (the user decides).

## Multi-repo
A feature spanning LIB + BE may produce changes in **both** `rezil-esms` and `rezil-esms-lib`:
- Create a branch and PR per affected repo (same `<type>/YYYY-MM-REZIL-XXXX-<SCREEN-CODE>` convention, base `feature/mvp2`).
- Land the LIB PR first if BE depends on it; cross-link the PRs in their bodies and in the Jira comment.
- If a change is single-repo, do single-repo. State the split as an Assumption when it is not obvious from BD.

## Quality gates (must pass before any PR)
- Backend / LIB: `sbt scalafmtCheckAll "scalafix --check"`, `sbt test`, `sbt compile`.
- Frontend: `npm run check`, FE unit tests, `npm run build`.
- OpenAPI/Aspida: regenerate the client and confirm it builds.
- Security: `./semgrep-rules/scan.sh`.
- If any gate FAILS → stop, report, do **NOT** open the PR.

## PR
- Base `feature/mvp2`; title `[<phase>] <SCREEN-CODE> | REZIL-XXXX - <summary>`.
- Body = `templates/pr_template.md` with placeholders filled, plus a short **Changes / Tests / Risk / Assumptions** digest from the phase artifacts (this workflow's PR may carry the digest; the fix-bug workflow's strict template-only rule does not apply here).
- Comment the Jira ticket with the PR link(s) (markdown link form) + scope.

## Human Gate
- AI stops after PR creation. **Never merges, never deploys, never force-pushes `develop`/`main`** (force-push nhánh feature của mình được nếu cần).
- Human reviews the PR(s) and the digest, then merges.
