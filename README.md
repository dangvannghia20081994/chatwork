# AI Agent — rezil-esms

A safe, Jira-driven AI coding workflow for the **rezil-esms** monorepos. The agent reads a Jira
ticket, makes a minimal change, runs the quality gates, opens a PR, and updates Jira — then **stops**.
It never merges and never deploys.

---

## 0. Prerequisites & setup

The agent drives the **Claude Code CLI** (`claude`) plus `git` / `gh`, and talks to Jira through an
**Atlassian MCP server**. Set these up once before the Quick start.

### 0.1 Required tools

| Tool                     | Min version      | Check              | Notes                                                        |
|--------------------------|------------------|--------------------|--------------------------------------------------------------|
| Node.js                  | ≥ 20 (tested 24) | `node -v`          | runs the scripts + the `ui-next` web UI                      |
| Git                      | any recent       | `git --version`    |                                                              |
| GitHub CLI `gh`          | ≥ 2.4            | `gh --version`     | used to open PRs                                             |
| Claude Code CLI `claude` | ≥ 2.x            | `claude --version` | **must be on `PATH` as `claude`** — the UI spawns it by name |

### 0.2 Install + log in to the Claude CLI

```bash
# Install (either one):
npm install -g @anthropic-ai/claude-code           # via npm
# or the native installer:  curl -fsSL https://claude.ai/install.sh | bash

claude            # first run prompts login; or run /login inside the CLI
```

Logging in writes `~/.claude/.credentials.json` (OAuth token) — the same file the UI's `/usage`
panel reads to show live rate-limit usage. Confirm with `claude --version` and `which claude`.

### 0.3 Authenticate GitHub

```bash
gh auth login          # pick GitHub.com → HTTPS → login with browser
gh auth status         # verify
```

### 0.4 Connect the Atlassian MCP (Jira)

Auto mode reads/updates Jira via the `mcp__atlassian__*` tools, which come from the Atlassian
**remote MCP** server. Register it with the Claude CLI once (OAuth opens in the browser):

```bash
claude mcp add --transport http atlassian https://mcp.atlassian.com/v1/mcp
claude mcp list        # should show:  atlassian: https://mcp.atlassian.com/v1/mcp (HTTP) - ✔ Connected
```

> Only the `atlassian` server is required for this agent. (Other MCP servers you may have — mysql,
> gsheets, figma — are unrelated to the ticket→PR workflow.)

### 0.5 Clone the target repos

The agent edits the real repos at the paths declared in `config/github.json`. Clone them there
(default layout — adjust the paths in `github.json` if yours differ):

```bash
# example for the default layout under ~/IdeaProjects
git clone https://github.com/hybrid-tech-rezil/rezil-esms.git        ~/IdeaProjects/rezil-esms
git clone https://github.com/hybrid-tech-rezil/rezil-esms-lib.git    ~/IdeaProjects/rezil-esms-lib
git clone https://github.com/hybrid-tech-rezil/rezil-esms-mobile.git ~/IdeaProjects/rezil-esms-mobile
```

A repo whose path is missing is simply skipped; the run fails fast if the **selected** repo's path
does not exist.

### 0.6 Web UI (optional)

```bash
cd ui-next
cp .env.example .env          # set UI_BASIC_AUTH="user:pass" (required if you expose it via ngrok)
npm install
npm run build && npm run start   # http://127.0.0.1:5000
```

See [§8](#8-web-ui-auto-mode) for the UI features and `ui-next/README.md` for pm2 / ngrok details.

---

## 1. Quick start

```bash
# 1. Start work on a ticket (sync base + create the branch)
node scripts/fix-ticket.js REZIL-2352 ISSUE-001 --issue-type="Bug"

# 2. ...implement the change in the repo, then run the quality gates (see §4)...

# 3. Open the PR (pushes branch, fills template, base = develop)
node scripts/create-pr.js REZIL-2352 ISSUE-001 --summary="Fix duplicate rows on issue list"

# 4. Render the Jira comment to post (PR link + scope)
node scripts/update-jira.js REZIL-2352 comment \
  --pr=https://github.com/hybrid-tech-rezil/rezil-esms/pull/1300 --scope=ISSUE-001
```

Add `--dry-run` to any script to preview the commands without executing.

---

## 2. Project layout

| Path             | What                                                                                    |
|------------------|-----------------------------------------------------------------------------------------|
| `CLAUDE.md`      | Role, core rules, workflow, full structure                                              |
| `WORKFLOW.md`    | The 12-step ticket workflow                                                             |
| `AGENT_RULES.md` | Allowed / forbidden actions, failure policy                                             |
| `TOOLS.md`       | Tools the agent may use                                                                 |
| `MEMORY.md`      | Index of long-term knowledge in `memory/`                                               |
| `config/`        | `jira.json`, `github.json`, `project.json`, `story.json`                                |
| `prompts/`       | Task prompts: `fix_bug`, `create_pr`, `update_jira`, `review_pr`                        |
| `memory/`        | `architecture`, `coding_style`, `database`, `deployment`, `common_bugs`, `jira_history` |
| `scripts/`       | `fix-ticket`, `create-pr`, `update-jira` (+ `_lib` helpers)                             |
| `templates/`     | `pr_template`, `jira_comment`, `commit_message`                                         |
| `ui-next/`       | Next.js web UI (auto mode + chat) — see [§8](#8-web-ui-auto-mode)                       |

---

## 3. Configuration (`config/`)

- **`github.json`** — org `hybrid-tech-rezil`, 3 repos (`rezil-esms` default, `-lib`, `-mobile`),
  base branch `develop`, branch rule, `neverMerge` / `neverForcePush`.
- **`jira.json`** — site / cloudId / project `REZIL`, plus **`branchTypeByIssueType`** (issue type → branch type).
- **`project.json`** — product metadata, stack, repo list, DB environments.
- **`story.json`** — the secondary "story" project the UI can target (path, remote, base branch,
  branch types) for non-Jira free-form tasks. Used by Auto Story / Chat-Story in `ui-next/`.

All four contain only public identifiers — no secrets.

---

## 4. Conventions (verified against the repo)

**Branch** — `<type>/YYYY-MM-REZIL-XXXX-<SCREEN-CODE>`
- `type` is auto-mapped from the Jira issue type: `Bug→bug`, `RoC→roc`, `Task/Story/Epic→feature`, `Technical Stuff→feat`, `QA→fix` (default `fix`). Override with `--type=`.
- e.g. `bug/2026-06-REZIL-2352-ISSUE-001`

**Commit** — `REZIL-XXXX - <summary>` (imperative, English; no conventional-commits prefix).

**PR title** — `[<phase>] <SCREEN-CODE> | REZIL-XXXX - <summary>`
- phase: `develop → [PreUAT-MVP2-A]`, `feature/mvp2-b → [Sprint NN]`
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

| Script           | Purpose                                                             | Usage                                                                        |
|------------------|---------------------------------------------------------------------|------------------------------------------------------------------------------|
| `fix-ticket.js`  | Sync base + create the work branch                                  | `<REZIL-XXXX> <SCREEN-CODE> [repo] --issue-type="Bug" [--type=] [--dry-run]` |
| `create-pr.js`   | Push branch + open PR (base `develop`, body from template)          | `<REZIL-XXXX> <SCREEN-CODE> [repo] --summary="..." [--dry-run]`              |
| `update-jira.js` | Render the Jira comment to post (applied via Atlassian integration) | `<REZIL-XXXX> comment --pr=<url> --scope=<SCREEN-CODE>`                      |

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
Read Jira → Sync develop → Create branch → Analyze → Implement
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
npm run build && npm run start   # http://127.0.0.1:5000
# or via pm2:  pm2 start ecosystem.config.js   (ui-next + ngrok→5000)
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
A Q&A view at `http://127.0.0.1:5000/chat` — pick project (REZIL/Story), ask about code or tickets,
answers stream in Vietnamese. Type `/usage` to see token usage + estimated cost. Multi-turn (session).
- **Read-only by default**: Read/Grep code, search the web, read Jira — no edits.
- **✏️ Sửa code toggle**: tick it to let the chat edit files and run build/test (`Edit`/`Write`/`Bash`).
  Same hard limits apply — never merge, never deploy, never force-push. Leave it off for plain Q&A.
- ⚠️ With the toggle on, the chat edits the **default repo's working tree** on its current branch
  (no auto branch/commit) — use it for quick iterative changes, not the full ticket workflow (use Auto for that).

