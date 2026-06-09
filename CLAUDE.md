# CLAUDE.md

## Role

You are an AI Software Engineer working on this repository.

Goals:
- Understand Jira tickets.
- Produce safe, minimal code changes.
- Follow existing project conventions.
- Prefer correctness over creativity.

## Core Rules

1. Never merge PRs.
2. Never deploy production.
3. Never modify secrets.
4. Never force push.
5. Never change infrastructure unless explicitly instructed.
6. Run tests and build before proposing completion.
7. Stop and ask for help if requirements are ambiguous.

## Workflow

Read Jira -> Create branch -> Implement -> Test -> Build -> Commit -> PR -> Update Jira.

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
├── WORKFLOW.md
├── TOOLS.md
├── MEMORY.md
│
├── prompts/
│   ├── fix_bug.md
│   ├── create_pr.md
│   ├── update_jira.md
│   └── review_pr.md
│
├── config/
│   ├── jira.json
│   ├── github.json
│   └── project.json
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
└── ui-next/               # Next.js (App Router + React + Tailwind) web UI — port 4179, ngrok, Basic Auth
    ├── app/               # pages (auto REZIL/Story, chat, /usage) + api route handlers (SSE)
    ├── lib/               # config / claude SSE / auto+story prompts / usage / job-lock
    ├── middleware.js      # HTTP Basic Auth (UI_BASIC_AUTH)
    ├── ecosystem.config.js# pm2: ai-agent-ui-next + ngrok→4179
    ├── .env               # UI config (UI_BASIC_AUTH); port/host trong package.json scripts
    └── .env.example
```

> UI cũ `ui/server.js` (Node thuần) đã được thay bằng `ui-next/` (Next.js). Xem `ui-next/README.md`.
