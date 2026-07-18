#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/menarium}"
STATE_DIR="${DEPLOY_ROOT}/state"
APP_ENV_FILE="${APP_ENV_FILE:-${DEPLOY_ROOT}/shared/app.env}"
DEPLOY_SCRIPT="${DEPLOY_SCRIPT:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/deploy-docker.sh}"

for state_file in previous-image previous-release; do
  if [[ ! -s "${STATE_DIR}/${state_file}" ]]; then
    printf 'Rollback is unavailable: %s is missing.\n' "${STATE_DIR}/${state_file}" >&2
    exit 1
  fi
done

previous_image="$(<"${STATE_DIR}/previous-image")"
previous_release="$(<"${STATE_DIR}/previous-release")"

APP_IMAGE="${previous_image}" \
RELEASE_SHA="${previous_release}" \
APP_ENV_FILE="${APP_ENV_FILE}" \
DEPLOY_ROOT="${DEPLOY_ROOT}" \
SKIP_MIGRATIONS=true \
bash "${DEPLOY_SCRIPT}"
