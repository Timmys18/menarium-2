#!/bin/bash
# Общие службы для трёх проектов. Идемпотентно: повторный запуск безопасен.
# PostgreSQL запускается через pg_ctl от пользователя postgres, поэтому
# переживает завершение вызвавшей его оболочки (embedded-postgres — нет:
# он умирает вместе с родительским процессом).
# Пути можно переопределить переменными окружения: скрипты писались под одну
# машину, но ничего машинно-зависимого в них нет.
#   REPO  — каталог репозитория (вариант 1)
#   STACK — где искать соседние скрипты
REPO=${REPO:-/home/user/menarium-2}
STACK=${STACK:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}
#   LOGS  — куда писать логи витрин и PostgreSQL
LOGS=${LOGS:-${TMPDIR:-/tmp}/menarium-showcase}
mkdir -p "$LOGS"

BIN=$REPO/node_modules/@embedded-postgres/linux-x64/native/bin
DATA=$REPO/.data/postgres
LOG=$LOGS/postgres.log
export PGPASSWORD=menarium_local_password

if pg_isready -h localhost -p 5433 >/dev/null 2>&1; then
  echo "postgres  уже поднят"
else
  touch "$LOG"; chown postgres:postgres "$LOG"
  su postgres -s /bin/bash -c "'$BIN/pg_ctl' -D '$DATA' -l '$LOG' -o '-p 5433' -w start" >/dev/null 2>&1
  if pg_isready -h localhost -p 5433 >/dev/null 2>&1; then echo "postgres  запущен"
  else echo "postgres  НЕ ПОДНЯЛСЯ"; tail -5 "$LOG"; exit 1; fi
fi

if redis-cli ping >/dev/null 2>&1; then
  echo "redis     уже поднят"
else
  redis-server --daemonize yes >/dev/null 2>&1; sleep 1
  redis-cli ping >/dev/null 2>&1 && echo "redis     запущен" || { echo "redis     НЕ ПОДНЯЛСЯ"; exit 1; }
fi

for db in menarium_v1 menarium_v2 menarium_v3; do
  if psql -h localhost -p 5433 -U menarium -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" 2>/dev/null | grep -q 1; then
    echo "база      $db уже есть"
  else
    psql -h localhost -p 5433 -U menarium -d postgres -c "CREATE DATABASE $db" >/dev/null 2>&1 \
      && echo "база      $db создана" || echo "база      $db ОШИБКА"
  fi
done
