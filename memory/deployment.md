# Deployment — rezil-esms

> Rules: **never deploy production**, never change CI/CD or infra without explicit approval.
> This file = underlying CI/CD plumbing (reference only). Agent operational steps (gh CLI, DEV1-only
> PR promote) live in `RELEASE_FLOW.md`.

## Mechanism
All deploys are **tag-triggered GitHub Actions → build Docker image → push to AWS ECR** (region `ap-northeast-1`). No SSH/manual server steps.

## Tag → environment mapping
| Tag pattern     | Env                   | Workflow                      | Version suffix       |
|-----------------|-----------------------|-------------------------------|----------------------|
| `dev1/v<X.Y.Z>` | dev1                  | `*-dev1.yaml`                 | `-dev1-SNAPSHOT`     |
| `stg/v<X.Y.Z>`  | staging               | `*-stg.yaml`                  | `-stg-SNAPSHOT`      |
| `v<X.Y.Z>`      | **production (main)** | **none — manual/human-gated** | (release, no suffix) |

Version in the tag must match the first `## X.Y.Z` line in `CHANGELOG.md`.

## Workflows (`.github/workflows/`)
- `be-api-dev1.yaml`, `be-api-stg.yaml` — Scala API → ECR
- `be-lambda-dev1.yaml` — Lambda functions → ECR
- `web-dev1.yaml`, `web-stg.yaml` — Svelte frontend → ECR
- **No prod workflow exists** (intentional — see `RELEASE_FLOW.md`). Prod tag must be created by hand by a human.

## Build
- **Backend**: sbt + sbt-release → Docker image (arm64) → ECR. Secrets via sops + AWS KMS. Flyway migrations in `etc/database/`.
- **Frontend**: yarn/npm build → Node 22 Alpine Docker image → ECR. OpenAPI client gen from `etc/openapi/`.
- Env configs: `etc/docker/env.{local,dev1,stg}/`.

## Release flow (branch → env)
```
develop (integration)
  → cherry-pick to release/env-dev1 → bump CHANGELOG → tag dev1/vX.Y.Z → CI deploys dev1, auto back-merges tag to develop
  → cherry-pick to release/env-stg  → tag stg/vX.Y.Z (weekly)        → CI deploys stg, auto back-merges
  → merge stg → main → tag vX.Y.Z   → PROD (manual; no auto workflow)
```
- CI gate: tag must be reachable from `develop`/`release/*` (blocks rogue deploys).
- Back-merge to `develop` is automatic via `be-api/after-release.sh`.

## Agent rule
**Deploy is out of scope for the agent** — the agent never deploys (dev1/stg/prod). All releases are human-driven per `RELEASE_FLOW.md`. This file is reference knowledge only, to understand how the repo ships.
