#!/bin/bash
# Прогон приёмочного набора для витрины v3 на СВОЕЙ базе.
#
# Без этого `npm run test:e2e` в menarium-v3 берёт DATABASE_URL из .env
# проекта — то есть бьёт по menarium_v3, той самой базе, которую прямо
# сейчас отдаёт витрина на 3103. Набор её пересевает, витрина теряет
# данные, а сам прогон ловит чужие соединения и начинает мигать.
#
#   ./e2e-v3.sh                    весь набор
#   ./e2e-v3.sh e2e/chat-media.spec.ts --update-snapshots
set -e
# Пути можно переопределить переменными окружения: скрипты писались под одну
# машину, но ничего машинно-зависимого в них нет.
#   REPO  — каталог репозитория (вариант 1)
#   STACK — где искать соседние скрипты
REPO=${REPO:-/home/user/menarium-2}
STACK=${STACK:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}
VARIANTS=${VARIANTS:-$(dirname "$REPO")}
cd "$VARIANTS/menarium-v3"

export DATABASE_URL="postgresql://menarium:menarium_local_password@localhost:5433/menarium_v3_e2e?schema=public"
export REDIS_URL="redis://127.0.0.1:6379/9"
export PORT=3001
unset NEXTAUTH_URL APP_URL

# Порт 3001 обязан быть свободен: если его держит чужой сервер, набор молча
# отработает по чужой сборке и чужой базе. Это уже случалось.
for i in 1 2 3 4 5 6 7 8 9 10; do
  pid=$(fuser -n tcp 3001 2>/dev/null | tr -d ' ')
  [ -z "$pid" ] && break
  kill -9 $pid 2>/dev/null
  sleep 1
done
[ -n "$(fuser -n tcp 3001 2>/dev/null)" ] && { echo "3001 занят"; exit 1; }

# Витрина того же варианта должна быть остановлена.
#
# И она, и сервер тестов раскладывают статику в один и тот же каталог
# `<проект>/.next/standalone/.next/static`: оба сначала стирают его, потом
# копируют заново. Если они работают одновременно, один вырывает чанки
# из-под другого, и живой сервер начинает отдавать ChunkLoadError на
# случайных переходах. Выглядит как «тест иногда подвисает», а на деле —
# два процесса делят один каталог.
for i in 1 2 3 4 5 6 7 8 9 10; do
  pid=$(fuser -n tcp 3103 2>/dev/null | tr -d ' ')
  [ -z "$pid" ] && break
  echo "останавливаю витрину v3 на 3103: набор и витрина делят .next/standalone"
  kill -9 $pid 2>/dev/null
  sleep 1
done

redis-cli -n 9 flushdb >/dev/null
npx prisma migrate deploy >/dev/null
ALLOW_PROD_SEED=true node prisma/seed.mjs >/dev/null

npm run test:e2e -- "$@"
