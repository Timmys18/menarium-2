# Menarium 2.0 Deployment

## Baseline

Production should run in Russian infrastructure to simplify 152-FZ compliance:

- PostgreSQL primary database with daily backups.
- Redis for rate limits.
- S3-compatible object storage in РФ, for example Yandex Object Storage.
- Node.js LTS behind Nginx with HTTPS.
- Domain: `menarium.ru`.

## Environment

Required variables:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://menarium.ru
NEXTAUTH_SECRET=<strong-secret>
NEXT_PUBLIC_APP_URL=https://menarium.ru
REDIS_URL=redis://...
STORAGE_PROVIDER=s3
STORAGE_ENDPOINT=https://storage.yandexcloud.net
STORAGE_BUCKET=<bucket>
STORAGE_REGION=ru-central1
STORAGE_ACCESS_KEY_ID=<key>
STORAGE_SECRET_ACCESS_KEY=<secret>
STORAGE_PUBLIC_BASE_URL=https://<bucket>.storage.yandexcloud.net
```

## Release

```bash
npm ci
npx prisma migrate deploy
npm run build
pm2 start ecosystem.config.cjs --env production
pm2 save
```

## Nginx

Use `deploy/nginx/menarium.ru.conf` as the site config. Certbot can manage TLS:

```bash
certbot --nginx -d menarium.ru -d www.menarium.ru
```

## Health Check

The health endpoint is:

```bash
GET /api/health
```

Expected response has `status: "ok"`.

## Backups

Use `deploy/scripts/backup-postgres.sh` from cron on the database host or deploy host with DB access:

```cron
15 3 * * * /opt/menarium/deploy/scripts/backup-postgres.sh
```

Store backup artifacts outside the app server and verify restore monthly.
