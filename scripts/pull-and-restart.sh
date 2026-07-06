#!/usr/bin/env bash
#
# Pull latest develop from rezil-esms / rezil-esms-mobile / rezil-esms-lib
# and restart affected services.
#
# Usage:
#   ./scripts/pull-and-restart.sh                       # pull all, restart/build only repos that changed
#   ./scripts/pull-and-restart.sh admin                 # only rezil-esms
#   ./scripts/pull-and-restart.sh mobile                # only rezil-esms-mobile
#   ./scripts/pull-and-restart.sh lib                   # only rezil-esms-lib (rebuild api images if lib changed)
#   BRANCH=feature/x ./scripts/pull-and-restart.sh      # pull a different branch
#   FORCE_BUILD=1 ./scripts/pull-and-restart.sh         # force restart/build even if no new commits
#   FORCE_BUILD=1 ./scripts/pull-and-restart.sh lib     # force rebuild lib image (vd nghi cache hỏng)
#   SAFE=1 ./scripts/pull-and-restart.sh                # disable auto-reset on force-pushed remote
#
# Mặc định: chỉ restart/build khi pull mang về commit mới. Repo up-to-date → skip.
# Tự động xử lý force-push: nếu local diverge với remote, script sẽ reset
# cứng về origin/<branch> miễn là working tree sạch. Đặt SAFE=1 nếu muốn tắt auto-reset (script sẽ bail khi diverge).
#
# Nếu rezil-esms có commit mới (target admin/all), script tự chạy Flyway
# migrate (sbt migrateAll) bên trong container admin-api sau khi restart —
# xem migrate_admin(). Idempotent nên chạy lại vô hại kể cả khi không có
# migration file mới.
#
set -euo pipefail

BRANCH="${BRANCH:-develop}"
SAFE="${SAFE:-0}"
TARGET="${1:-all}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PARENT="$(cd "$ROOT/.." && pwd)"

PULL_CHANGED=0

pull() {
  local repo="$1"
  local path="$PARENT/$repo"
  if [[ ! -d "$path/.git" ]]; then
    echo ">> skip $repo (not a git repo at $path)"
    return
  fi
  echo ">> pulling $repo @ $BRANCH"
  local before
  before=$(git -C "$path" rev-parse HEAD)
  git -C "$path" fetch --prune origin
  git -C "$path" checkout "$BRANCH"

  local remote="origin/$BRANCH"

  # Local is already at or behind remote on a linear path → fast-forward.
  if git -C "$path" merge-base --is-ancestor HEAD "$remote"; then
    git -C "$path" pull --ff-only origin "$BRANCH"
    _record_pull_change "$path" "$before"
    return
  fi

  # Diverged. Could be: force-pushed remote, OR local has unpushed commits.
  local ahead behind
  ahead=$(git -C "$path" rev-list --count "$remote"..HEAD)
  behind=$(git -C "$path" rev-list --count HEAD.."$remote")
  echo "!! $repo: diverged from $remote (local ahead=$ahead, behind=$behind)"

  if [[ "$SAFE" == "1" ]]; then
    echo "   SAFE=1 set — refusing to auto-reset. Resolve manually." >&2
    exit 1
  fi

  if ! git -C "$path" diff --quiet || ! git -C "$path" diff --cached --quiet; then
    echo "!! $repo has uncommitted changes — commit/stash before auto-reset" >&2
    exit 1
  fi

  if [[ "$ahead" -gt 0 ]]; then
    echo "   $repo has $ahead local commit(s) not on $remote — discarding them."
    git -C "$path" log --oneline "$remote..HEAD" | sed 's/^/     /'
  fi

  echo ">> hard-resetting $repo to $remote"
  git -C "$path" reset --hard "$remote"
  _record_pull_change "$path" "$before"
}

_record_pull_change() {
  local path="$1"
  local before="$2"
  local after
  after=$(git -C "$path" rev-parse HEAD)
  if [[ "$before" != "$after" ]]; then
    PULL_CHANGED=1
    echo "   $(basename "$path"): $before → $after"
  else
    echo "   $(basename "$path"): no change"
  fi
}

# Flyway migration for rezil_esms / rezil_esms_inspection is a separate sbt
# task (migrateAll), not run automatically by `sbt run` on boot. Run it via a
# second sbt invocation inside the already-running admin-api container, with
# the same DB host overrides used to start it (see admin-api command in
# docker-compose.yml). Idempotent — Flyway only applies pending migrations.
migrate_admin() {
  echo ">> running Flyway migration for rezil-esms (sbt migrateAll)"
  docker compose exec -T admin-api sbt \
    -Drezil.db.mysql.rezil_esms.hostspec.master.hosts=mysql:3306 \
    -Drezil.db.mysql.rezil_esms_inspection.hostspec.master.hosts=mysql:3306 \
    migrateAll
}

cd "$ROOT"

case "$TARGET" in
  admin)
    # Fast path: admin source is bind-mounted, sbt run hot-reloads → no image build.
    pull rezil-esms
    if [[ "$PULL_CHANGED" == "1" || "${FORCE_BUILD:-0}" == "1" ]]; then
      docker compose restart admin-api admin-web
      # nginx caches upstream IPs at startup → restart to pick up new container IPs.
      docker compose restart nginx
      docker compose up --no-deps admin-openapi-build
      migrate_admin
    else
      echo ">> rezil-esms unchanged — skipping restart"
    fi
    ;;
  mobile)
    # Fast path: mobile source is bind-mounted, sbt run hot-reloads → no image build.
    pull rezil-esms-mobile
    if [[ "$PULL_CHANGED" == "1" || "${FORCE_BUILD:-0}" == "1" ]]; then
      docker compose restart mobile-api mobile-web
      docker compose restart nginx
      docker compose up --no-deps mobile-openapi-build
    else
      echo ">> rezil-esms-mobile unchanged — skipping restart"
    fi
    ;;
  lib)
    # Shared lib is baked into the api images via `sbt publishLocal` in the
    # Dockerfile. To make sure admin/mobile-api pick up the new jar (sbt would
    # otherwise reuse the cached version under the same coordinates), we:
    #   1) pull lib source,
    #   2) rebuild api images (publishLocal runs into the image),
    #   3) evict the old jar from the shared ivy/coursier caches so sbt
    #      re-resolves it from /root/.ivy2/local on next `sbt run`.
    # Skip steps 2–3 if pull didn't bring any new commit (FORCE_BUILD=1 overrides).
    pull rezil-esms-lib
    if [[ "$PULL_CHANGED" == "0" && "${FORCE_BUILD:-0}" != "1" ]]; then
      echo ">> lib unchanged — skipping image rebuild (set FORCE_BUILD=1 to override)"
    else
      docker compose build admin-api mobile-api
      docker compose stop admin-api mobile-api
      # Evict only the lib artifacts (keep deps cache to avoid 10min re-download).
      docker compose run --rm --no-deps --entrypoint sh admin-api -c '
        rm -rf /root/.ivy2/cache/jp.co.rezil 2>/dev/null || true
        rm -rf /root/.cache/coursier/v1/https/*/com/rezil 2>/dev/null || true
        rm -rf /root/.cache/coursier/v1/file/*/com/rezil 2>/dev/null || true
        echo "lib cache evicted"
      '
      docker compose up -d admin-api mobile-api
      docker compose restart nginx
      docker compose up --no-deps admin-openapi-build mobile-openapi-build
    fi
    ;;
  all)
    PULL_CHANGED=0; pull rezil-esms;        ADMIN_CHANGED="$PULL_CHANGED"
    PULL_CHANGED=0; pull rezil-esms-mobile; MOBILE_CHANGED="$PULL_CHANGED"
    PULL_CHANGED=0; pull rezil-esms-lib;    LIB_CHANGED="$PULL_CHANGED"

    FORCE="${FORCE_BUILD:-0}"

    # Lib changed → full rebuild of both api images + evict cache.
    if [[ "$LIB_CHANGED" == "1" || "$FORCE" == "1" ]]; then
      echo ">> lib changed — rebuilding api images + evicting cache"
      docker compose build admin-api mobile-api
      docker compose stop admin-api mobile-api
      docker compose run --rm --no-deps --entrypoint sh admin-api -c '
        rm -rf /root/.ivy2/cache/jp.co.rezil 2>/dev/null || true
        rm -rf /root/.cache/coursier/v1/https/*/com/rezil 2>/dev/null || true
        rm -rf /root/.cache/coursier/v1/file/*/com/rezil 2>/dev/null || true
      '
      docker compose up -d admin-api mobile-api admin-web mobile-web
      docker compose restart nginx
      docker compose up --no-deps admin-openapi-build mobile-openapi-build
    else
      # Lib unchanged → admin/mobile only need a container restart (source is
      # bind-mounted, sbt run recompiles in place).
      NGINX_NEEDS_RESTART=0
      if [[ "$ADMIN_CHANGED" == "1" ]]; then
        docker compose restart admin-api admin-web
        docker compose up --no-deps admin-openapi-build
        NGINX_NEEDS_RESTART=1
      else
        echo ">> rezil-esms unchanged — skipping admin restart"
      fi
      if [[ "$MOBILE_CHANGED" == "1" ]]; then
        docker compose restart mobile-api mobile-web
        docker compose up --no-deps mobile-openapi-build
        NGINX_NEEDS_RESTART=1
      else
        echo ">> rezil-esms-mobile unchanged — skipping mobile restart"
      fi
      [[ "$NGINX_NEEDS_RESTART" == "1" ]] && docker compose restart nginx
    fi

    [[ "$ADMIN_CHANGED" == "1" ]] && migrate_admin
    ;;
  *)
    echo "Unknown target: $TARGET (use: all | admin | mobile | lib)" >&2
    exit 1
    ;;
esac

echo ">> done"
