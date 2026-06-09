# AI Agent — rezil-esms

A safe, Jira-driven AI coding workflow for the **rezil-esms** monorepos. The agent reads a Jira
ticket, makes a minimal change, runs the quality gates, opens a PR, and updates Jira — then **stops**.
It never merges and never deploys.

---

## 1. Quick start

```bash
# 1. Start work on a ticket (sync base + create the branch)
node scripts/fix-ticket.js REZIL-2352 ISSUE-001 --issue-type="Bug"

# 2. ...implement the change in the repo, then run the quality gates (see §4)...

# 3. Open the PR (pushes branch, fills template, base = feature/mvp2)
node scripts/create-pr.js REZIL-2352 ISSUE-001 --summary="Fix duplicate rows on issue list"

# 4. Render the Jira comment to post (PR link + scope)
node scripts/update-jira.js REZIL-2352 comment \
  --pr=https://github.com/hybrid-tech-rezil/rezil-esms/pull/1300 --scope=ISSUE-001
```

Add `--dry-run` to any script to preview the commands without executing.

---

## 2. Project layout

| Path | What |
|---|---|
| `CLAUDE.md` | Role, core rules, workflow, full structure |
| `WORKFLOW.md` | The 12-step ticket workflow |
| `AGENT_RULES.md` | Allowed / forbidden actions, failure policy |
| `TOOLS.md` | Tools the agent may use |
| `MEMORY.md` | Index of long-term knowledge in `memory/` |
| `config/` | `jira.json`, `github.json`, `project.json` |
| `prompts/` | Task prompts: `fix_bug`, `create_pr`, `update_jira`, `review_pr` |
| `memory/` | `architecture`, `coding_style`, `database`, `deployment`, `common_bugs`, `jira_history` |
| `scripts/` | `fix-ticket`, `create-pr`, `update-jira` (+ `_lib` helpers) |
| `templates/` | `pr_template`, `jira_comment`, `commit_message` |

---

## 3. Configuration (`config/`)

- **`github.json`** — org `hybrid-tech-rezil`, 3 repos (`rezil-esms` default, `-lib`, `-mobile`),
  base branch `feature/mvp2`, branch rule, `neverMerge` / `neverForcePush`.
- **`jira.json`** — site / cloudId / project `REZIL`, plus **`branchTypeByIssueType`** (issue type → branch type).
- **`project.json`** — product metadata, stack, repo list, DB environments.

All three contain only public identifiers — no secrets.

---

## 4. Conventions (verified against the repo)

**Branch** — `<type>/YYYY-MM-REZIL-XXXX-<SCREEN-CODE>`
- `type` is auto-mapped from the Jira issue type: `Bug→bug`, `RoC→roc`, `Task/Story/Epic→feature`, `Technical Stuff→feat`, `QA→fix` (default `fix`). Override with `--type=`.
- e.g. `bug/2026-06-REZIL-2352-ISSUE-001`

**Commit** — `REZIL-XXXX - <summary>` (imperative, English; no conventional-commits prefix).

**PR title** — `[<phase>] <SCREEN-CODE> | REZIL-XXXX - <summary>`
- phase: `feature/mvp2 → [PreUAT-MVP2-A]`, `feature/mvp2-b → [Sprint NN]`
- e.g. `[PreUAT-MVP2-A] ISSUE-001 | REZIL-2352 - Fix duplicate rows`

**Quality gates (must pass before PR)**
- Backend: `sbt scalafmtCheckAll "scalafix --check"`
- Frontend: `npm run check`
- Security: `./semgrep-rules/scan.sh`
- If any fail → stop, report, do **not** open the PR.

**Jira comment** (`templates/jira_comment.md`)
```
PR: <pr-url>
Phạm vi ảnh hưởng: <SCREEN-CODE>
```

---

## 5. Scripts

| Script | Purpose | Usage |
|---|---|---|
| `fix-ticket.js` | Sync base + create the work branch | `<REZIL-XXXX> <SCREEN-CODE> [repo] --issue-type="Bug" [--type=] [--dry-run]` |
| `create-pr.js` | Push branch + open PR (base `feature/mvp2`, body from template) | `<REZIL-XXXX> <SCREEN-CODE> [repo] --summary="..." [--dry-run]` |
| `update-jira.js` | Render the Jira comment to post (applied via Atlassian integration) | `<REZIL-XXXX> comment --pr=<url> --scope=<SCREEN-CODE>` |

Scripts read `config/*.json`, shell out to `git`/`gh`, and enforce the guardrails (never force-push, refuse to PR from the base branch). Jira **writes** are performed by the agent via the Atlassian integration, not by the script.

---

## 6. Guardrails (hard rules)

- Never merge PRs · never force push · never modify secrets.
- **Never deploy** (any env) — deploy is out of scope; all releases are human-driven per `RELEASE_FLOW.md`.
- Never change infra / CI/CD without explicit approval.
- Stop and ask if requirements are ambiguous.
- Keep changes small; reuse existing patterns; no unrelated refactor.

---

## 7. Workflow summary

```
Read Jira → Sync feature/mvp2 → Create branch → Analyze → Implement
  → Quality gates (scalafmt/scalafix, npm check, semgrep) → Tests → Build
  → Commit → Push → Create PR → Update Jira → STOP (human reviews & merges)
```

See `WORKFLOW.md` for the full step list and `CLAUDE.md` for the role definition.

---

## 8. Web UI (auto mode)

A browser UI (**Next.js + React + Tailwind**, in `ui-next/`) to hand a ticket/task to Claude, which
**implements it end-to-end up to creating the PR**. Dark/light theme, responsive.

```bash
cd ui-next
npm install                  # first time
npm run build && npm run start   # http://127.0.0.1:4179
# or via pm2:  pm2 start ecosystem.config.js   (ui-next + ngrok→4179)
```

- **Auto REZIL** (`/auto`): enter the **Jira ticket** and pick the **repo**; submit. The server runs
  `claude -p --permission-mode auto` in that repo and **streams progress** live (in Vietnamese): it
  reads the ticket (deriving issue type + screen code), creates the branch, edits code, runs the
  quality gates, commits, pushes, opens the PR, and comments Jira.
- **Auto Story** (`/story`): free-form task → branch `fix|feature/YYYY-MM-<desc>` → PR to `develop`
  (no Jira; uses the story repo's own agents).
- **Info gate**: if the ticket/task lacks enough info, Claude stops and prints `⛔ NEED-INFO:`
  (no changes) — the UI shows a banner so you can Cancel.
- **Concurrency per repo**: one job per repo at a time; a second job on the **same repo** returns `409`.
- **Hard limits**: never merge, never deploy, never force-push (enforced via `disallowedTools` +
  system prompt). Non-interactive — it states assumptions and proceeds.
- Binds **127.0.0.1 only**; **Basic Auth** via `ui-next/.env` `UI_BASIC_AUTH` (needed when exposed via ngrok).
- ⚠️ Auto mode makes **real changes** to the selected repo and opens a **real PR**. Review before merging.

### Chat (`/chat`)
A Q&A view at `http://127.0.0.1:4179/chat` — pick project (REZIL/Story), ask about code or tickets,
answers stream in Vietnamese. Type `/usage` to see token usage + estimated cost. Multi-turn (session).
- **Read-only by default**: Read/Grep code, search the web, read Jira — no edits.
- **✏️ Sửa code toggle**: tick it to let the chat edit files and run build/test (`Edit`/`Write`/`Bash`).
  Same hard limits apply — never merge, never deploy, never force-push. Leave it off for plain Q&A.
- ⚠️ With the toggle on, the chat edits the **default repo's working tree** on its current branch
  (no auto branch/commit) — use it for quick iterative changes, not the full ticket workflow (use Auto for that).

