# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`rezil-docker` — the local Docker Compose dev stack for Rezil ESMS. It contains no application source itself; it orchestrates MySQL, MinIO, two Scala/Play backends (`admin-api`, `mobile-api`), two Vite frontends (`admin-web`, `mobile-web`), an Nginx reverse proxy, and Swagger UI, all via bind mounts into sibling repos.

Required sibling layout (all four repos cloned at the same level):

```
IdeaProjects/rezil/
├── rezil-docker/          # this repo
├── rezil-esms/            # admin (BE + FE)
├── rezil-esms-mobile/     # mobile (BE + FE)
└── rezil-esms-lib/        # shared Scala lib (baked into image)
```

## Common commands

```bash
# Build images, then start the full stack
docker compose build
docker compose up -d

# Staged-distribution variant (closer to prod runtime than `sbt run`)
docker compose -f docker-compose.stage.yml up --build -d
docker compose -f docker-compose.stage.yml restart admin-api mobile-api   # after Scala changes

# Logs / shell
docker compose logs -f admin-api mobile-api
docker compose exec admin-api bash
docker compose exec mysql mysql -uroot -proot

# Stop (keeps data) vs. teardown (destroys volumes — avoid unless intentional)
docker compose stop
docker compose down
docker compose down -v   # wipes MySQL/MinIO data + node_modules cache — last resort only

# Rebuild after touching rezil-esms-lib or a Dockerfile
docker compose build admin-api mobile-api

# Regenerate OpenAPI + typed client for one side
docker compose up admin-openapi-build
docker compose up mobile-openapi-build
```

Daily pull/restart workflow — use this instead of manual git pull + restart:

```bash
./scripts/pull-and-restart.sh              # pull all 3 repos, restart/build only what changed
./scripts/pull-and-restart.sh admin        # rezil-esms only
./scripts/pull-and-restart.sh mobile       # rezil-esms-mobile only
./scripts/pull-and-restart.sh lib          # rezil-esms-lib only (rebuilds api images if lib changed)

BRANCH=release/1.2 ./scripts/pull-and-restart.sh   # pull a different branch
FORCE_BUILD=1 ./scripts/pull-and-restart.sh lib    # force rebuild even without new commits
SAFE=1 ./scripts/pull-and-restart.sh               # disable auto-reset on force-pushed remote
```

## Architecture notes

- **`admin-api` / `mobile-api` build on a shared base image** (`rezil-esms-sbt-lib:local`, built from `docker/rezil-esms-lib/Dockerfile`) that runs `sbt publishLocal` on `rezil-esms-lib`. The lib jar is baked into the image — it is *not* bind-mounted. Application source for admin/mobile *is* bind-mounted, so `sbt run` hot-reloads on change: no image rebuild needed for admin/mobile code changes.
- **When `rezil-esms-lib` changes, both `admin-api` and `mobile-api` images must be rebuilt** — `docker compose build admin-api mobile-api` — since the lib jar only enters the stack at image-build time, never via bind mount. A plain container restart is not enough.
- **Lib cache gotcha**: sbt/ivy/coursier caches are named volumes that persist across rebuilds and key on `groupId:artifactId:version`. If `rezil-esms-lib` changes without a version bump, a rebuild can still serve the stale jar from cache. `pull-and-restart.sh lib` (and the `all` target when lib changed) handles both steps: rebuild the api images *and* evict `jp.co.rezil` artifacts from `/root/.ivy2/cache` and `/root/.cache/coursier` before restarting.
- **`pull-and-restart.sh` force-push handling**: before pulling, it snapshots `HEAD`. If local is a fast-forward ancestor of `origin/<branch>`, it does `pull --ff-only`. If diverged (force-push or unpushed local commits), it hard-resets to remote *only if the working tree is clean*; a dirty tree bails with an error. `SAFE=1` disables the auto-reset entirely (bails instead). Only restarts/rebuilds services whose repo's `HEAD` actually changed (or when `FORCE_BUILD=1`).
- **Nginx same-origin proxying** avoids CORS: `rezil.nip.io/api` → `admin-api`, `rezil-mobile.nip.io/api/v1` → `mobile-api`. Frontends are configured via `PUBLIC_API_ENDPOINT` / `VITE_API_BASE_URL` in `docker-compose.yml` to call same-origin, not cross-origin. Nginx resolves upstream container IPs at startup, so recreating an api container (via `restart`) requires restarting `nginx` too, or requests 502 — `pull-and-restart.sh` already does this after every api restart/rebuild.
- **OpenAPI build scripts** (`scripts/admin-openapi-build.sh`, `scripts/mobile-openapi-build.sh`) copy the source `etc/openapi/` tree to a tmp dir and `sed`-rename a handful of colliding parameter names (Redocly errors on same-named components across files) before bundling with `redocly bundle` and generating the typed client with `openapi2aspida`. The source YAML files themselves are never modified — only the tmp copy.
- **`docker-compose.stage.yml`** runs `sbt stage` + the staged binary instead of `sbt run`, and adds a second MySQL service (`mysql_165`, port 3306, separate volume) alongside the default one (port 13306) — used for testing against a differently-configured MySQL without disturbing the primary dev DB.
- **Admin DB migrations (Flyway) are not automatic.** `rezil-esms` (`be-api`) manages `rezil_esms` / `rezil_esms_inspection` schema changes as Flyway migration files under `etc/database/{rezil_esms,rezil_esms_inspection}/{common,env-*}/`, applied via the sbt task `migrateAll` (see `rezil-esms/etc/database/MIGRATIONS.md`) — `sbt run` does **not** run them on boot. `pull-and-restart.sh admin`/`all` runs this automatically after restarting `admin-api` whenever `rezil-esms` pulled new commits (`migrate_admin()` in the script); manually it's `docker compose exec admin-api sbt -Drezil.db.mysql.rezil_esms.hostspec.master.hosts=mysql:3306 -Drezil.db.mysql.rezil_esms_inspection.hostspec.master.hosts=mysql:3306 migrateAll`. Idempotent — safe to re-run.
- **Database**: two schemas are created on first boot — `rezil_esms` (via `MYSQL_DATABASE`) and `rezil_esms_inspection` (via an init script that lives in `rezil-esms`, not this repo: `../rezil-esms/etc/docker/env.local/mysql/data/01_mysql_user.sql`). Init scripts only run against an empty `mysql-data` volume; schema/seed changes on an existing volume must be applied directly via SQL, not by recreating the volume (that destroys local data). `etc/mysql/init/02_fix_auth_plugin.sql` forces `caching_sha2_password` on the MySQL users to silence a `sha256_password` deprecation warning — also init-script-only, so on existing volumes it must be re-applied by hand (see README "Troubleshooting" for the exact `ALTER USER` block).

## Working across repos

`rezil-esms` and `rezil-esms-mobile` source is bind-mounted directly (not copied into images), so editing files there is immediately visible to the running containers. `rezil-esms-lib` is the exception: it's only baked in at image-build time, so changes require rebuilding `admin-api`/`mobile-api` and evicting the ivy/coursier cache (see above) — plain `docker compose restart` is not sufficient for lib changes.
