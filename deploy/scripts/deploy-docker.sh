#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

: "${APP_IMAGE:?APP_IMAGE is required}"
: "${RELEASE_SHA:?RELEASE_SHA is required}"
: "${APP_ENV_FILE:?APP_ENV_FILE is required}"

SKIP_MIGRATIONS="${SKIP_MIGRATIONS:-false}"
if [[ "${SKIP_MIGRATIONS}" != "true" ]]; then
  : "${MIGRATION_IMAGE:?MIGRATION_IMAGE is required}"
fi

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/menarium}"
APP_CONTAINER="${APP_CONTAINER:-menarium-web}"
CANDIDATE_CONTAINER="${APP_CONTAINER}-candidate"
APP_PORT="${APP_PORT:-3000}"
CANDIDATE_PORT="${CANDIDATE_PORT:-3001}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-120}"
STATE_DIR="${DEPLOY_ROOT}/state"
LOCK_FILE="${DEPLOY_ROOT}/deploy.lock"

log() {
  local level="$1"
  local event="$2"
  shift 2
  printf '%s level=%s event=%s release=%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${level}" "${event}" "${RELEASE_SHA}" "$*"
}

for command_name in docker curl flock; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    log error missing_dependency "command=${command_name}"
    exit 1
  fi
done

if [[ ! -f "${APP_ENV_FILE}" ]]; then
  log error missing_env_file "path=${APP_ENV_FILE}"
  exit 1
fi

if [[ ! "${APP_PORT}" =~ ^[0-9]+$ || ! "${CANDIDATE_PORT}" =~ ^[0-9]+$ ]]; then
  log error invalid_port "app_port=${APP_PORT} candidate_port=${CANDIDATE_PORT}"
  exit 1
fi

mkdir -p "${STATE_DIR}"
exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  log error deploy_locked "another release is already running"
  exit 1
fi

cleanup() {
  docker rm --force "${CANDIDATE_CONTAINER}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

run_app() {
  local name="$1"
  local image="$2"
  local host_port="$3"
  local restart_policy="$4"
  local release="$5"
  local resource_args=()

  if [[ -n "${APP_MEMORY_LIMIT:-}" ]]; then
    resource_args+=(--memory "${APP_MEMORY_LIMIT}")
  fi
  if [[ -n "${APP_CPU_LIMIT:-}" ]]; then
    resource_args+=(--cpus "${APP_CPU_LIMIT}")
  fi

  docker run --detach \
    --name "${name}" \
    --restart "${restart_policy}" \
    --init \
    --cap-drop ALL \
    --security-opt no-new-privileges:true \
    --log-opt max-size=20m \
    --log-opt max-file=5 \
    --add-host host.docker.internal:host-gateway \
    --env-file "${APP_ENV_FILE}" \
    --env "APP_RELEASE=${release}" \
    --env PORT=3000 \
    --publish "127.0.0.1:${host_port}:3000" \
    --label "com.menarium.release=${release}" \
    "${resource_args[@]}" \
    "${image}" >/dev/null
}

wait_for_readiness() {
  local name="$1"
  local port="$2"
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))

  while (( SECONDS < deadline )); do
    if curl --fail --silent --show-error --max-time 5 "http://127.0.0.1:${port}/api/health/ready" >/dev/null; then
      return 0
    fi
    if [[ "$(docker inspect --format '{{.State.Running}}' "${name}" 2>/dev/null || true)" != "true" ]]; then
      break
    fi
    sleep 2
  done

  log error readiness_failed "container=${name} port=${port}"
  docker logs --tail 100 "${name}" 2>&1 || true
  return 1
}

write_state() {
  local prefix="$1"
  local image="$2"
  local release="$3"

  printf '%s\n' "${image}" >"${STATE_DIR}/${prefix}-image.tmp"
  printf '%s\n' "${release}" >"${STATE_DIR}/${prefix}-release.tmp"
  mv "${STATE_DIR}/${prefix}-image.tmp" "${STATE_DIR}/${prefix}-image"
  mv "${STATE_DIR}/${prefix}-release.tmp" "${STATE_DIR}/${prefix}-release"
}

previous_image="$(docker inspect --format '{{.Config.Image}}' "${APP_CONTAINER}" 2>/dev/null || true)"
previous_release="$(docker inspect --format '{{index .Config.Labels "com.menarium.release"}}' "${APP_CONTAINER}" 2>/dev/null || true)"
if [[ -n "${previous_image}" && -z "${previous_release}" ]]; then
  previous_release="legacy-rollback"
fi

log info pull_started "app_image=${APP_IMAGE}"
if ! docker pull "${APP_IMAGE}" >/dev/null; then
  if [[ "${SKIP_MIGRATIONS}" == "true" ]] && docker image inspect "${APP_IMAGE}" >/dev/null 2>&1; then
    log warn pull_failed_using_local_image "app_image=${APP_IMAGE}"
  else
    log error pull_failed "app_image=${APP_IMAGE}"
    exit 1
  fi
fi
if [[ "${SKIP_MIGRATIONS}" != "true" ]]; then
  docker pull "${MIGRATION_IMAGE}" >/dev/null
  log info migration_started "image=${MIGRATION_IMAGE}"
  docker run --rm \
    --name "menarium-migrate-${RELEASE_SHA:0:12}" \
    --add-host host.docker.internal:host-gateway \
    --env-file "${APP_ENV_FILE}" \
    --env "APP_RELEASE=${RELEASE_SHA}" \
    "${MIGRATION_IMAGE}"
  log info migration_completed "image=${MIGRATION_IMAGE}"
fi

docker rm --force "${CANDIDATE_CONTAINER}" >/dev/null 2>&1 || true
log info candidate_started "port=${CANDIDATE_PORT}"
run_app "${CANDIDATE_CONTAINER}" "${APP_IMAGE}" "${CANDIDATE_PORT}" no "${RELEASE_SHA}"
wait_for_readiness "${CANDIDATE_CONTAINER}" "${CANDIDATE_PORT}"
log info candidate_ready "port=${CANDIDATE_PORT}"

docker rm --force "${CANDIDATE_CONTAINER}" >/dev/null 2>&1 || true
docker rm --force "${APP_CONTAINER}" >/dev/null 2>&1 || true

log info cutover_started "port=${APP_PORT}"
if ! run_app "${APP_CONTAINER}" "${APP_IMAGE}" "${APP_PORT}" unless-stopped "${RELEASE_SHA}" || \
  ! wait_for_readiness "${APP_CONTAINER}" "${APP_PORT}"; then
  log error cutover_failed "attempting_automatic_rollback=true"
  docker rm --force "${APP_CONTAINER}" >/dev/null 2>&1 || true

  if [[ -n "${previous_image}" ]]; then
    run_app "${APP_CONTAINER}" "${previous_image}" "${APP_PORT}" unless-stopped "${previous_release}"
    if wait_for_readiness "${APP_CONTAINER}" "${APP_PORT}"; then
      log warn rollback_completed "image=${previous_image} previous_release=${previous_release}"
    else
      log error rollback_failed "image=${previous_image} previous_release=${previous_release}"
    fi
  else
    log error rollback_unavailable "no_previous_image=true"
  fi
  exit 1
fi

if [[ -n "${previous_image}" ]]; then
  write_state previous "${previous_image}" "${previous_release}"
fi
write_state current "${APP_IMAGE}" "${RELEASE_SHA}"

log info release_completed "image=${APP_IMAGE} port=${APP_PORT}"
