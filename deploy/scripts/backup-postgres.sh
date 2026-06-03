#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/menarium/postgres}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="${BACKUP_DIR}/menarium-${STAMP}.dump"

mkdir -p "${BACKUP_DIR}"
pg_dump "${DATABASE_URL}" --format=custom --no-owner --no-privileges --file="${TARGET}"
find "${BACKUP_DIR}" -type f -name "menarium-*.dump" -mtime +14 -delete

echo "Created ${TARGET}"
