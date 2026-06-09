# Architecture — rezil-esms

Full-stack monorepo for an electrical safety management system (ESMS).

## Top-level layout
| Dir | Purpose | Stack |
|---|---|---|
| `app/` | Admin web UI (CRUD: sites, equipment, engineers, inspections, reports) | SvelteKit 2 / Svelte 5 / TS, SMUI, Aspida+Axios |
| `be-api/` | REST API backend | Play Framework 2.9, Scala 3.3.5, Slick |
| `be-lambda/` | Scheduled batch jobs (AWS Lambda) | Scala 3.3.5, Lambda Java 21 arm64 |
| `etc/` | DB migrations, OpenAPI spec, Docker env configs, scripts | — |
| `hooks/` | Git hooks (pre-commit git-secrets, pre-push scalafmt/scalafix) | — |
| `semgrep-rules/` | Security scan rules (`scan.sh`) | — |

Shared library: **`jp.co.rezil:rezil-esms`** (the `rezil-esms-lib` repo), published to S3 Maven repo, consumed by `be-api` + `be-lambda` (Slick models, repositories).

## Data flow
```
app (Svelte, JWT)
  → be-api (Play controllers → service → repository)
    → shared lib (Slick/JDBC)
      → MySQL (rezil_esms + rezil_esms_inspection)

CloudWatch cron → be-lambda → shared lib → MySQL
```

## Backend (be-api)
- Structure: `controllers/api/<domain>/` → `service/` → repositories (in shared lib). DI via Guice.
- Models split: `model/reads/` (request DTOs), `model/writes/<domain>/` (response DTOs).
- Routing: `be-api/conf/routes` (150+ endpoints). Config `application.conf` symlinks to `etc/docker/env.local/`.
- Auth: JWT/Cognito; `POST /auth/login`, `GET /auth/refresh`. RBAC in `mvc/permission/`.
- Two DBs: `rezil_esms` (main) + `rezil_esms_inspection`.

## Frontend (app)
- SvelteKit 2 (Node adapter), Vite 7. Dev proxies `/api/*` → `localhost:9000`.
- Atomic design components: `src/lib/components/{atoms,molecules,organisms,layouts}/`.
- API client: `src/lib/api/HttpClient.ts` (Axios + Aspida), auto token-refresh on 401. Types auto-generated from `etc/openapi/`.
- Forms: Felte + Yup. i18n: svelte-i18n (Japanese). Stores in `src/lib/stores/`.

## be-lambda
- `RequestHandler` functions, e.g. `AggregateEngineerUsedPoint` (monthly engineer point aggregation, 1st of month JST). Connects both DBs via shared lib.

## Local dev (docker-compose.yml)
- MySQL 8.0 (port 13306, `rezil`/`pass`), MinIO (S3 mock), Swagger UI (8080).

## Key refs
- `RELEASE_FLOW.md` — tag-based release dev1→stg→main
- `CHANGELOG.md` — version source of truth (`## X.Y.Z - YYYY-MM-DD`)
- `etc/openapi/.openapi.yaml` — API contract
