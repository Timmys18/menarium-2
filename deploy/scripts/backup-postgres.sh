#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_S3_URI:?BACKUP_S3_URI is required}"
: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT is required}"

BACKUP_STATE_DIR="${BACKUP_STATE_DIR:-/opt/menarium/state/backups}"
BACKUP_SSE_MODE="${BACKUP_SSE_MODE:-AES256}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_NAME="menarium-postgres-${STAMP}.dump.age"
REMOTE_URI="${BACKUP_S3_URI%/}/postgres/${STAMP}/${BACKUP_NAME}"
AWS_ARGS=()
SSE_ARGS=()

if [[ -n "${BACKUP_S3_ENDPOINT:-}" ]]; then
  AWS_ARGS+=(--endpoint-url "${BACKUP_S3_ENDPOINT}")
fi
if [[ "${BACKUP_SSE_MODE}" != "none" ]]; then
  SSE_ARGS+=(--sse "${BACKUP_SSE_MODE}")
fi

for command_name in pg_dump pg_restore age aws sha256sum flock; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    printf 'Missing backup dependency: %s\n' "${command_name}" >&2
    exit 1
  fi
done

mkdir -p "${BACKUP_STATE_DIR}"
exec 9>"${BACKUP_STATE_DIR}/backup.lock"
if ! flock -n 9; then
  printf 'Another database backup is already running.\n' >&2
  exit 1
fi

WORK_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

DUMP_FILE="${WORK_DIR}/menarium-postgres-${STAMP}.dump"
ENCRYPTED_FILE="${WORK_DIR}/${BACKUP_NAME}"
CHECKSUM_FILE="${ENCRYPTED_FILE}.sha256"

printf '%s event=backup_started target=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${REMOTE_URI}"
pg_dump "${DATABASE_URL}" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --lock-wait-timeout=10s \
  --file="${DUMP_FILE}"

pg_restore --list "${DUMP_FILE}" >/dev/null
age --recipient "${BACKUP_AGE_RECIPIENT}" --output "${ENCRYPTED_FILE}" "${DUMP_FILE}"
(
  cd "${WORK_DIR}"
  sha256sum "${BACKUP_NAME}" >"${BACKUP_NAME}.sha256"
)

aws "${AWS_ARGS[@]}" s3 cp "${ENCRYPTED_FILE}" "${REMOTE_URI}" "${SSE_ARGS[@]}" --only-show-errors
aws "${AWS_ARGS[@]}" s3 cp "${CHECKSUM_FILE}" "${REMOTE_URI}.sha256" "${SSE_ARGS[@]}" --only-show-errors

remote_checksum="$(aws "${AWS_ARGS[@]}" s3 cp "${REMOTE_URI}.sha256" - --only-show-errors)"
local_checksum="$(<"${CHECKSUM_FILE}")"
if [[ "${remote_checksum}" != "${local_checksum}" ]]; then
  printf 'Remote backup checksum does not match the uploaded backup.\n' >&2
  exit 1
fi

printf '%s event=backup_completed target=%s bytes=%s\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  "${REMOTE_URI}" \
  "$(wc -c <"${ENCRYPTED_FILE}")"
