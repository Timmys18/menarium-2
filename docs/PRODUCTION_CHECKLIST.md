# Menarium Production Checklist

This checklist is for the real `menarium.ru` launch path.

## Infrastructure

- Choose Russian or legally acceptable hosting.
- Create PostgreSQL database and enable automated backups.
- Create Redis instance for production rate limits.
- Create S3-compatible object storage bucket for media.
- Configure `menarium.ru` and `www.menarium.ru` DNS records.
- Issue HTTPS certificate with Certbot or platform-managed TLS.

## Environment

- Copy `.env.production.example` to the production environment.
- Generate a strong `NEXTAUTH_SECRET`.
- Set `ADMIN_EMAILS` to real administrator email addresses.
- Set `DATABASE_URL`, `REDIS_URL`, and all storage credentials.
- Do not use seed demo passwords in production.

## Release

- Run `npm ci`.
- Run `npm run db:generate`.
- Run `npm run db:deploy`.
- Run `npm run build`.
- Start via PM2, Docker, or managed Node runtime.
- Verify `GET /api/health` returns HTTP 200 with `ok: true`.

## Functional Smoke

- Register a new user.
- Log in and log out.
- Edit profile and upload avatar.
- Create an item with images.
- Edit and delete own item without active swaps.
- Create a second user and propose an exchange.
- Accept, decline, revoke, cancel and complete exchange flows.
- Send deal chat messages.
- Send item chat messages.
- Verify notifications and unread count.
- Verify admin can archive and restore listings.

## Legal And Operations

- Final legal review for privacy policy and user agreement.
- Confirm personal data processing approach under 152-FZ.
- Configure backup retention and monthly restore drill.
- Configure server logs and error monitoring.
- Document incident contact and support channel.
