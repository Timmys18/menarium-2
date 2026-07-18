#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
: "${BACKUP_OBJECT_URI:?BACKUP_OBJECT_URI is required}"
: "${BACKUP_AGE_IDENTITY_FILE:?BACKUP_AGE_IDENTITY_FILE is required}"

if [[ "${ALLOW_DATABASE_RESTORE:-}" != "I_UNDERSTAND_THIS_REQUIRES_AN_EMPTY_DATABASE" ]]; then
  printf 'Set ALLOW_DATABASE_RESTORE=I_UNDERSTAND_THIS_REQUIRES_AN_EMPTY_DATABASE to continue.\n' >&2
  exit 1
fi

for command_name in psql pg_restore age aws sha256sum; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    printf 'Missing restore dependency: %s\n' "${command_name}" >&2
    exit 1
  fi
done

if [[ ! -r "${BACKUP_AGE_IDENTITY_FILE}" ]]; then
  printf 'Age identity file is not readable: %s\n' "${BACKUP_AGE_IDENTITY_FILE}" >&2
  exit 1
fi

AWS_ARGS=()
if [[ -n "${BACKUP_S3_ENDPOINT:-}" ]]; then
  AWS_ARGS+=(--endpoint-url "${BACKUP_S3_ENDPOINT}")
fi

WORK_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

BACKUP_NAME="${BACKUP_OBJECT_URI##*/}"
ENCRYPTED_FILE="${WORK_DIR}/${BACKUP_NAME}"
CHECKSUM_FILE="${ENCRYPTED_FILE}.sha256"
DUMP_FILE="${WORK_DIR}/menarium-restore.dump"

aws "${AWS_ARGS[@]}" s3 cp "${BACKUP_OBJECT_URI}" "${ENCRYPTED_FILE}" --only-show-errors
aws "${AWS_ARGS[@]}" s3 cp "${BACKUP_OBJECT_URI}.sha256" "${CHECKSUM_FILE}" --only-show-errors
(
  cd "${WORK_DIR}"
  sha256sum --check "${BACKUP_NAME}.sha256"
)

age --decrypt --identity "${BACKUP_AGE_IDENTITY_FILE}" --output "${DUMP_FILE}" "${ENCRYPTED_FILE}"
pg_restore --list "${DUMP_FILE}" >/dev/null

existing_tables="$(psql "${RESTORE_DATABASE_URL}" --no-psqlrc --tuples-only --no-align --command "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname = 'public';")"
if [[ "${existing_tables}" != "0" ]]; then
  printf 'Restore target must be empty; found %s public tables.\n' "${existing_tables}" >&2
  exit 1
fi

pg_restore "${DUMP_FILE}" \
  --dbname="${RESTORE_DATABASE_URL}" \
  --exit-on-error \
  --single-transaction \
  --no-owner \
  --no-privileges

verification="$(psql "${RESTORE_DATABASE_URL}" --no-psqlrc --tuples-only --no-align --field-separator=, --command 'SELECT (SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL), (SELECT count(*) FROM "User"), (SELECT count(*) FROM "Item"), (SELECT count(*) FROM "SwapRequest");')"
IFS=, read -r migration_count user_count item_count swap_count <<<"${verification}"

if [[ "${migration_count}" == "0" ]]; then
  printf 'Restore verification failed: no completed migrations found.\n' >&2
  exit 1
fi

printf '{"event":"restore_verified","migrations":%s,"users":%s,"items":%s,"swaps":%s}\n' \
  "${migration_count}" "${user_count}" "${item_count}" "${swap_count}"
