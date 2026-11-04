#!/usr/bin/env bash
# Builds and starts the UI on this server, then checks it through Caddy.
#
#   deploy/deploy.sh
#
# Runs from any checkout of the repo (the runner's workspace or a manual
# copy): the compose project name is fixed, so the container is the same.
# Optional overrides go in ~/apps/platform/ui.env (PUBLIC_HOST, EDGE_NETWORK,
# EDGE_CA). See docs/deploy.md.
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=${PLATFORM_UI_ENV:-$HOME/apps/platform/ui.env}
if [[ -f $ENV_FILE ]]; then
  set -a; . "$ENV_FILE"; set +a
fi
export PUBLIC_HOST=${PUBLIC_HOST:-intranet.jdh.local}
export EDGE_NETWORK=${EDGE_NETWORK:-intranet-jdh_default}
EDGE_CA=${EDGE_CA:-$HOME/apps/INTRANET-JDH-API/deploy/caddy/ca/root.crt}
export GIT_SHA=${GIT_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo unknown)}

COMPOSE=(docker compose -f deploy/compose.prod.yaml)

# Shared with the edge stack's deploys: two builds on one host at once starve
# each other, and a backup must not run mid-restart.
exec 9>"${DEPLOY_LOCK:-$HOME/apps/.deploy.lock}"
flock 9

docker network inspect "$EDGE_NETWORK" >/dev/null 2>&1 \
  || { echo "Missing network $EDGE_NETWORK: start the edge stack first" >&2; exit 1; }
[[ -f $EDGE_CA ]] || { echo "Missing the Caddy root CA at $EDGE_CA" >&2; exit 1; }

echo "> Build $GIT_SHA for https://$PUBLIC_HOST"
"${COMPOSE[@]}" build ui

echo "> Up"
"${COMPOSE[@]}" up -d ui

echo "> Check"
for _ in $(seq 1 40); do
  if curl -fsS --cacert "$EDGE_CA" --resolve "$PUBLIC_HOST:443:127.0.0.1" \
    "https://$PUBLIC_HOST/api/health" | grep -q '"ok"'; then
    docker image prune -f >/dev/null
    echo "> Deployed $GIT_SHA"
    exit 0
  fi
  sleep 3
done

echo "The UI did not answer through Caddy at https://$PUBLIC_HOST/api/health" >&2
"${COMPOSE[@]}" ps
"${COMPOSE[@]}" logs --tail 80 ui
exit 1
