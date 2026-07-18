# Выпуск Menarium

Этот документ описывает единственный поддерживаемый путь выпуска `menarium.ru`: Docker, Nginx, PostgreSQL, Redis и S3-совместимое хранилище. Ручная сборка приложения на боевом сервере не используется.

## Что происходит при выпуске

1. Каждый pull request собирает контейнер сайта и контейнер обновления базы, но никуда их не публикует.
2. После попадания кода в `main` GitHub сохраняет оба контейнера с неизменяемым номером коммита.
3. Если тестовый выпуск включен, версия устанавливается в `staging`: обновляется база, рядом со старой версией запускается кандидат и проверяет PostgreSQL и Redis.
4. Только здоровый кандидат заменяет текущую версию. При неудаче старая версия запускается автоматически.
5. Боевой выпуск выполняется тегом `v*` или вручную через защищенную среду `production`.
6. После установки GitHub проверяет главную, вход, health endpoints, robots, sitemap, TLS и защитные заголовки.

Обновления базы не откатываются автоматически. Поэтому `npm run release:check` запрещает операции, несовместимые с предыдущей версией приложения.

## Подготовка сервера

Нужен Linux-сервер с Docker Engine, Nginx, `curl` и `flock`. PostgreSQL, Redis и S3 могут быть управляемыми внешними сервисами. Если PostgreSQL или Redis находятся на том же сервере, используйте в URL имя `host.docker.internal`, а не `localhost`.

Создайте отдельного пользователя `menarium`, каталог `/opt/menarium` и разрешите этому пользователю запуск Docker. SSH-вход по паролю отключите; GitHub использует отдельный ключ выпуска.

Для Nginx:

```bash
sudo install -m 644 deploy/nginx/00-menarium-http.conf /etc/nginx/conf.d/00-menarium-http.conf
sudo install -m 644 deploy/nginx/menarium.ru.conf /etc/nginx/sites-available/menarium.ru.conf
sudo ln -s /etc/nginx/sites-available/menarium.ru.conf /etc/nginx/sites-enabled/menarium.ru.conf
sudo nginx -t
sudo systemctl reload nginx
```

Сертификат для `menarium.ru` и `www.menarium.ru` должен существовать до включения HTTPS-конфига. После выпуска проверьте автоматическое продление Certbot командой `certbot renew --dry-run`.

## Настройки GitHub

Создайте Environments `staging` и `production`. Для `production` включите обязательное ручное подтверждение.

Переменные каждого Environment:

- `DEPLOY_HOST`: адрес сервера.
- `DEPLOY_USER`: пользователь выпуска, обычно `menarium`.
- `DEPLOY_PATH`: абсолютный путь, обычно `/opt/menarium`.
- `PUBLIC_URL`: адрес среды, например `https://staging.menarium.ru`.

Защищенные Secrets каждого Environment:

- `SSH_PRIVATE_KEY`: отдельный закрытый SSH-ключ выпуска.
- `SSH_KNOWN_HOSTS`: заранее проверенная строка ключа сервера. Не получайте ее вслепую во время выпуска.
- `APP_ENV_FILE_CONTENTS`: полное содержимое настроек по образцу `.env.production.example` с адресом именно этой среды.

Переменные репозитория, нужные во время сборки:

- `NEXT_PUBLIC_SENTRY_DSN`: публичный DSN Sentry для ошибок в браузере.
- `STORAGE_PUBLIC_BASE_URL`: публичный origin S3/CDN.
- `STAGING_APP_URL`: канонический адрес staging.
- `PRODUCTION_APP_URL`: `https://menarium.ru`.
- `STAGING_DEPLOY_ENABLED`: `true` только после подготовки staging.
- `PRODUCTION_DEPLOY_ENABLED`: `true` только когда теги должны автоматически выпускаться в бой.
- `UPTIME_MONITOR_ENABLED`: `true` после открытия сайта в интернете.
- `PRODUCTION_PUBLIC_URL`: `https://menarium.ru`.

Начните со значений `false`. Без серверных настроек workflow только собирает и сохраняет контейнеры, ничего не устанавливая.

## Настройки приложения

Возьмите `.env.production.example` за основу. Обязательны уникальный `APP_RELEASE`, правильные `APP_ENVIRONMENT` и `APP_URL`, PostgreSQL, Redis, S3, рабочая почта, Sentry и аналитика. Workflow сам передает настоящий номер выпуска поверх файла.

Никогда не помещайте реальные секреты в репозиторий, Docker image, логи или переменные с префиксом `NEXT_PUBLIC_`.

## Выпуск и возврат

- `main` выпускается в staging, когда `STAGING_DEPLOY_ENABLED=true`.
- Тег вида `v1.2.0` выпускается в production, когда `PRODUCTION_DEPLOY_ENABLED=true`.
- Ручной запуск workflow `Release` позволяет только собрать версию либо установить ее в выбранную среду.
- Workflow `Roll back release` поднимает предыдущий контейнер без обратного изменения базы.

Автоматический возврат срабатывает, если кандидат или новая основная версия не проходят `/api/health/ready`. Ручной возврат используйте при пользовательской ошибке, которую автоматическая проверка не видит.

## Состояние сервиса

- `/api/health/live`: процесс приложения отвечает; используется Docker.
- `/api/health/ready`: PostgreSQL и Redis доступны; используется выпуском и внешним мониторингом.
- `/api/health`: совместимый псевдоним полной проверки.

Ответ содержит точный `release`. Health endpoints не кэшируются.

## Резервные копии

Установите PostgreSQL client, AWS CLI v2 и `age`. Используйте отдельный S3 bucket или аккаунт, не тот же доступ, что у пользовательских изображений.

1. Сгенерируйте ключ `age` на доверенном офлайн-устройстве.
2. На сервер передайте только публичный recipient; закрытый ключ не должен находиться рядом с базой.
3. Заполните `/opt/menarium/shared/backup.env` по `deploy/backup.env.example`.
4. Установите `deploy/systemd/menarium-backup.service` и `.timer`, затем включите timer.
5. В S3 включите versioning, server-side encryption, lifecycle и, если доступно, Object Lock.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now menarium-backup.timer
sudo systemctl start menarium-backup.service
sudo journalctl -u menarium-backup.service --since today
```

Рекомендуемое хранение: ежедневные копии 35 дней, ежемесячные 12 месяцев. Удаление выполняет lifecycle хранилища, а не взломанный сервер.

Проверка восстановления выполняется только в новую пустую базу:

```bash
RESTORE_DATABASE_URL='postgresql://.../menarium_restore' \
BACKUP_OBJECT_URI='s3://.../postgres/.../menarium-postgres-....dump.age' \
BACKUP_AGE_IDENTITY_FILE='/secure/offline/path/identity.txt' \
ALLOW_DATABASE_RESTORE=I_UNDERSTAND_THIS_REQUIRES_AN_EMPTY_DATABASE \
/opt/menarium/ops/restore-postgres.sh
```

Сценарий откажется работать с непустой базой, проверит checksum, структуру архива, примененные миграции и основные таблицы.
