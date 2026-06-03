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

For a real local database, create PostgreSQL database `menarium2`, update `DATABASE_URL`, then run:

```bash
npm run db:migrate
```

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
- `/privacy`
- `/terms`

Core backend:

- users and credentials auth;
- items, catalog and swipe feed;
- exchange state machine with `accept`, `decline`, `revoke`, `complete`, `cancel`;
- deal chat and item chat;
- notifications with contextual links;
- media upload abstraction.

## Production

See `docs/DEPLOYMENT_RU.md`.

Target domain: `menarium.ru`.
