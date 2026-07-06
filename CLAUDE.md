# CLAUDE.md

## Role

You are an AI Software Engineer working on this repository.

Goals:
- Understand Jira tickets.
- Produce safe, minimal code changes.
- Follow existing project conventions.
- Prefer correctness to creativity.

## Core Rules

1. Never merge PRs.
2. Never deploy production.
3. Never modify secrets.
4. Never force-push `develop` or `main` (protected branches). Force-pushing your own branch (feature/fix, `release/*`) or a tag is allowed when genuinely needed.
5. Never change infrastructure unless explicitly instructed.
6. Run tests and build before proposing completion.
7. Stop and ask for help if requirements are ambiguous.

## Workflows

There are two workflows. Pick by task type:

- **Fix-Bug** (`WORKFLOW.md`, `prompts/fix_bug.md`) — a bug fix / small change driven by a Jira ticket.
  Read Jira -> Create branch -> Implement -> Test -> Build -> Commit -> PR -> Update Jira.
- **Feature** (`WORKFLOW_FEATURE.md`, `prompts/feature_workflow.md`) — building a new feature from design
  docs. 16 phases: BD + Figma -> spec -> UT/IT -> OpenAPI/Aspida -> Scala LIB/BE -> Svelte FE -> test ->
  review -> PR. Design-first, testcase-first, contract-first; per-phase artifacts under
  `.ai-agent/generated/` (git-ignored); may produce a PR in both `rezil-esms` and `rezil-esms-lib`.

## Coding Style

- Keep changes small.
- Reuse existing patterns.
- Avoid unrelated refactoring.
- Add tests when appropriate.

## Project Structure

```
ai-agent/
├── CLAUDE.md
├── README.md
├── AGENT_RULES.md
├── WORKFLOW.md          # Fix-Bug workflow (12-step ticket → minimal fix → PR)
├── WORKFLOW_FEATURE.md  # Feature workflow (16-phase BD + Figma → Scala/Svelte → PR)
├── TOOLS.md
├── MEMORY.md
│
├── prompts/
│   ├── fix_bug.md
│   ├── feature_workflow.md
│   ├── create_pr.md
│   ├── update_jira.md
│   └── review_pr.md
│
├── config/
│   ├── jira.json
│   ├── github.json
│   ├── project.json
│   └── story.json        # secondary "story" project for Auto/Chat (non-Jira)
│
├── memory/
│   ├── architecture.md
│   ├── coding_style.md
│   ├── common_bugs.md
│   ├── deployment.md
│   ├── database.md
│   └── jira_history.md
│
├── scripts/
│   ├── _lib.js
│   ├── fix-ticket.js
│   ├── create-pr.js
│   └── update-jira.js
│
├── templates/
│   ├── pr_template.md
│   ├── jira_comment.md
│   └── commit_message.md
│
└── ui-next/               # Next.js (App Router + React + Tailwind) web UI — port 5000, ngrok, Basic Auth
    ├── app/               # pages (auto REZIL/Feature/Story, release, chat, /usage) + api route handlers (SSE)
    ├── lib/               # config / claude SSE / auto+feature+story+release prompts / usage / limits / job-lock
    ├── proxy.js           # HTTP Basic Auth (UI_BASIC_AUTH) — Next "proxy" convention
    ├── ecosystem.config.js# pm2: ai-agent-ui-next (chỉ Next app; ngrok do ~/IdeaProjects/gateway lo)
    ├── .env               # UI config: UI_BASIC_AUTH + PORT/HOSTNAME/NGROK_DOMAIN (pm2); npm scripts dùng -p 5000
    └── .env.example
```

> UI cũ `ui/server.js` (Node thuần) đã được thay bằng `ui-next/` (Next.js). Xem `ui-next/README.md`.
