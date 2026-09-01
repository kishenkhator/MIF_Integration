#!/usr/bin/env bash
set -euo pipefail
: "${MYSQL_USER:?Set MYSQL_USER}"
: "${MYSQL_PASSWORD:?Set MYSQL_PASSWORD}"
DB="${MYSQL_DATABASE:-maximo_integration}"
OUT_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUT_DIR"
mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --single-transaction --routines --triggers "$DB" > "$OUT_DIR/${DB}_${STAMP}.sql"
echo "Backup created: $OUT_DIR/${DB}_${STAMP}.sql"
