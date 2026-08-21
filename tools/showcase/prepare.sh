#!/bin/bash
# Миграции, сид и боевая сборка одного проекта.
set -e
D="$1"; cd "$D"
set -a; . ./.env; set +a
echo "[$D] миграции…"
npx prisma migrate deploy >/dev/null 2>&1
echo "[$D] сид…"
ALLOW_PROD_SEED=true node prisma/seed.mjs >/dev/null 2>&1
echo "[$D] сборка…"
npm run build 2>&1 | grep -E "Compiled|Failed|Error" | head -3
echo "[$D] готово"
