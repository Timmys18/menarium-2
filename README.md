# Menarium 2.0

New independent Menarium project: a Russian-language C2C barter platform with a premium Figma-driven UI, clean exchange lifecycle, two explicit chat domains, notifications, media storage, and production deployment preparation for `menarium.ru`.

This repository is not a continuation of the old Menarium codebase. The old project is only a knowledge donor; Figma Make is the visual contract.

## Stack

- Next.js App Router
- TypeScript
- Prisma + PostgreSQL
- NextAuth credentials auth
- Redis-backed rate limits
- S3-compatible media storage with local dev fallback
- Tailwind CSS v4

## Local Setup

```bash
npm ci
cp .env.example .env
npm run db:generate
npm run dev
```

Open `http://localhost:3000`.

For a real local database with Docker:

```bash
docker compose -f docker-compose.local.yml up -d
```

Then set in `.env`:

```bash
DATABASE_URL="postgresql://menarium:menarium_local_password@localhost:5432/menarium2?schema=public"
REDIS_URL="redis://localhost:6379"
```

Run migrations and optional seed:

```bash
npm run db:migrate
npm run db:seed
```

For a manually created PostgreSQL database, update `DATABASE_URL`, then run:

```bash
npm run db:migrate
```

Optional demo data for local or staging verification:

```bash
npm run db:seed
```

Demo accounts created by the seed script:

- `admin@menarium.ru` / `MenariumAdmin2026!`
- `maria@menarium.ru` / `MenariumDemo2026!`
- `dmitry@menarium.ru` / `MenariumDemo2026!`

Use these only outside production.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```

or:

```bash
npm run verify
```

## Product Scope

Production product routes:

- `/`
- `/catalog`
- `/swipe`
- `/new`
- `/my-items`
- `/item/[id]`
- `/item/[id]/edit`
- `/exchange`
- `/profile`
- `/profile/chats`
- `/profile/edit`
- `/auth/login`
- `/auth/register`
- `/notifications`
- `/admin`

Core backend:

- users and credentials auth;
- items, catalog and swipe feed;
- exchange state machine with `accept`, `decline`, `revoke`, `complete`, `cancel`;
- deal chat and item chat;
- notifications with contextual links;
- media upload abstraction.

## Production

- `/privacy`
- `/terms`

See also `docs/ROADMAP_RU.md` (status burndown), `docs/PRODUCTION_CHECKLIST.md`, and `.env.production.example` for launch.
