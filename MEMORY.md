# MEMORY

Index of long-term project knowledge. Each file under `memory/` holds one area; keep them updated as you learn.

## Index
- [architecture.md](memory/architecture.md) — monorepo layout, backend/frontend/lambda, data flow
- [coding_style.md](memory/coding_style.md) — scalafmt/scalafix, TS/Svelte conventions, commit format, quality gates
- [database.md](memory/database.md) — MySQL dual-schema, Flyway, Slick+Ixias, key tables, gotchas
- [deployment.md](memory/deployment.md) — release flow & CI/CD (reference only; agent never deploys)
- [common_bugs.md](memory/common_bugs.md) — recurring bugs + fixes, seeded from history
- [jira_history.md](memory/jira_history.md) — log of handled tickets (ticket / screen / branch / PR / status)

## How to use
- Read the relevant file before working a ticket.
- Append new findings: a recurring bug → `common_bugs.md`; a finished ticket → `jira_history.md`.
- Keep entries factual and concise; cite ticket keys / file paths.
