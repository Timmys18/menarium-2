#!/bin/bash
# Управление тремя витринами Менариума.
#
#   ./menarium.sh up        поднять службы и все три проекта
#   ./menarium.sh down      остановить все три
#   ./menarium.sh restart   down + up
#   ./menarium.sh status    что сейчас живо
#   ./menarium.sh build v2  пересобрать один проект
#   ./menarium.sh logs v2   хвост лога
#
# Остановка идёт через fuser по порту: в этой среде lsof процессы Next.js
# не видит, а pkill не всегда достаёт осиротевшие серверы.

# Пути можно переопределить переменными окружения: скрипты писались под одну
# машину, но ничего машинно-зависимого в них нет.
#   REPO  — каталог репозитория (вариант 1)
#   STACK — где искать соседние скрипты
REPO=${REPO:-/home/user/menarium-2}
STACK=${STACK:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}
#   LOGS  — куда писать логи витрин и PostgreSQL
LOGS=${LOGS:-${TMPDIR:-/tmp}/menarium-showcase}
mkdir -p "$LOGS"
# Каталоги вариантов лежат рядом с репозиторием: menarium-v1, -v2, -v3.
VARIANTS=${VARIANTS:-$(dirname "$REPO")}
PORTS=(3101 3102 3103)
NAMES=(v1 v2 v3)

# Глушим порт и ДОЖИДАЕМСЯ его освобождения. Без ожидания новый сервер падал
# с EADDRINUSE, а старый продолжал отдавать прежнюю сборку — «пересобрал, а
# ничего не изменилось» и при этом status показывал «работает».
stop_port() {
  local p=$1 pid i
  for i in 1 2 3 4 5 6 7 8 9 10; do
    pid=$(fuser -n tcp "$p" 2>/dev/null | tr -d ' ')
    [ -z "$pid" ] && return 0
    kill -9 $pid 2>/dev/null
    sleep 1
  done
  echo "порт $p освободить не удалось" >&2
  return 1
}

case "$1" in
  up)
    "$STACK/infra.sh" || exit 1
    for i in 0 1 2; do
      v=${NAMES[$i]}; port=${PORTS[$i]}; dir=$VARIANTS/menarium-$v
      stop_port "$port"
      if [ ! -f "$dir/.next/standalone/server.js" ]; then
        echo "$v        НЕТ СБОРКИ — сначала ./menarium.sh build $v"; continue
      fi
      nohup node "$STACK/serve.mjs" "$dir" > "$LOGS/$v.log" 2>&1 &
      disown
    done
    sleep 9
    for i in 0 1 2; do
      v=${NAMES[$i]}
      grep -q "EADDRINUSE" "$LOGS/$v.log" 2>/dev/null && echo "$v        ПОРТ БЫЛ ЗАНЯТ — отвечает старая сборка, повторите up"
    done
    "$0" status
    ;;
  down)
    for p in "${PORTS[@]}"; do stop_port "$p"; done
    echo "все три остановлены"
    ;;
  restart) "$0" down; "$0" up ;;
  status)
    for i in 0 1 2; do
      v=${NAMES[$i]}; port=${PORTS[$i]}
      code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 4 "http://127.0.0.1:$port/api/health")
      if [ "$code" = "200" ]; then echo "$v  http://localhost:$port  работает"
      else echo "$v  http://localhost:$port  НЕ ОТВЕЧАЕТ ($code) — $LOGS/$v.log"; fi
    done
    ;;
  build)
    v=$2; [ -z "$v" ] && { echo "укажите: build v1|v2|v3"; exit 1; }
    stop_port "310${v#v}"
    "$STACK/prepare.sh" "$VARIANTS/menarium-$v"
    ;;
  logs) tail -n 30 "$LOGS/${2:-v1}.log" ;;
  *) sed -n '2,12p' "$0" ;;
esac
