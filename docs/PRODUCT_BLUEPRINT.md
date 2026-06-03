# Menarium 2.0 Product Blueprint

Menarium 2.0 is a new independent product, not a continuation of the old repository.
The old codebase is a knowledge donor only. The Figma Make file is the visual contract.

## Product

Menarium is a Russian-language C2C barter platform where people exchange items and services without turning the product into a shop or social network.

Core promise:

- Create an item or service listing.
- Discover offers through catalog or swipe mode.
- Propose an item-to-item exchange.
- Manage the deal lifecycle with clear statuses.
- Chat in the right context.
- Receive notifications that deep-link to the exact action.

## Visual Contract

Figma Make `XT9Xe6gYW5lm6qWyuCTVpd` is the source of truth for UI:

- dark premium background `#0a0a0f`;
- glass cards with heavy blur and subtle white borders;
- Space Grotesk typography;
- teal, blue and purple gradients;
- 8px spacing grid;
- large rounded cards, mobile bottom navigation, animated cards;
- no fallback to the old repository UI.

Screens missing in Figma must be designed as direct continuations of the same design language.

## Production Product Routes

- `/` - homepage and product entry.
- `/catalog` - searchable and filterable item catalog.
- `/swipe` - swipe discovery.
- `/item/[id]` - listing details, owner contact and exchange proposal.
- `/item/[id]/edit` - owner edit flow.
- `/new` - create listing.
- `/my-items` - user's listings.
- `/exchange` - exchange center with incoming, outgoing and matches.
- `/profile` - user hub.
- `/profile/chats` - unified inbox.
- `/profile/edit` - real profile editing.
- `/auth/login`, `/auth/register`.
- `/privacy`, `/terms`.
- redirects: `/swaps`, `/profile/my-swaps` to `/exchange`.

## Domain Model

Keep only active domain concepts:

- `User`
- `Item`
- `SwapRequest`
- `DealMessage`
- `ItemThread`
- `ItemThreadMessage`
- `Notification`
- `MediaAsset`

Do not copy old legacy `Chat`, `ChatMessage`, or unused `ExchangeChain`.

## Exchange Lifecycle

Statuses:

- `PENDING`
- `ACCEPTED`
- `DECLINED`
- `COMPLETED`
- `CANCELLED`

Rules:

- The sender must own `senderItem`.
- A user cannot exchange with themself.
- Both items must be `ACTIVE`.
- A pending swap must be unique for the canonical item pair.
- `accept`: receiver only, from `PENDING`, moves both items to `IN_DEAL`.
- `decline`: receiver only, from `PENDING`.
- `revoke`: sender only, from `PENDING`.
- `complete`: either participant, from `ACCEPTED`; final only after both confirm.
- `cancel`: either participant, from `ACCEPTED`; returns items to `ACTIVE` when no other accepted swap uses them.

## Chat Model

There are two explicit chat domains:

- Deal chat: `DealMessage`, available after exchange is accepted, read-only in terminal statuses.
- Item chat: `ItemThread` and `ItemThreadMessage`, for questions before a deal exists.

No third legacy chat stack.

## API Contract

Use stable JSON from day one:

- errors: `{ "error": "..." }`;
- lists: `{ items, hasMore, limit, offset, total? }`;
- actions: `{ ok: true, data }`.

Protected API routes return JSON `401`, not HTML redirects.

Future mobile clients should be able to reuse the same contract.

## Production Baseline

Target domain: `menarium.ru`.

Production must be compatible with Russian infrastructure requirements:

- PostgreSQL in Russia or a legally acceptable equivalent;
- object storage in Russia or a legally acceptable equivalent;
- Redis for rate limits and short-lived infrastructure state;
- HTTPS, backups, healthcheck, rollback instructions;
- privacy and terms pages for 152-FZ readiness.

## Later Product Expansions

- Multi-party exchange chains, if they prove useful after the two-party exchange flow is excellent.
- Payments, only if Menarium intentionally expands beyond barter.
- Full AI photo valuation.
- Native mobile apps.
- Complex admin console beyond basic moderation hooks.
