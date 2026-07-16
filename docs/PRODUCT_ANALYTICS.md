# Product Analytics

Menarium uses a privacy-first, first-party analytics layer stored in PostgreSQL. It is designed to answer product questions without sending user behavior to an advertising platform.

## Privacy Contract

- The client can send only allowlisted event shapes.
- Dynamic route identifiers are replaced with route templates such as `/item/[id]`.
- IP addresses are not stored in the analytics table. A short HMAC is used only in the 60-second Redis rate-limit bucket.
- Email, name, city, item titles, searches, message text, report details, and URL query strings are never analytics properties.
- Anonymous visitor and 30-minute session identifiers are random, HTTP-only, same-site cookies.
- Product actions continue normally if analytics storage is unavailable.

## Authoritative Events

Server routes record successful outcomes: registration, email verification, login, item creation, swipe pass, exchange proposal, acceptance, decline, revoke, completion confirmation, completion, and cancellation. Unique lifecycle outcomes use deduplication keys.

The browser records page views and the start of registration, item creation, and exchange proposal flows. Browser events are useful for drop-off analysis but never replace server outcomes.

## Dashboard Definitions

The admin dashboard is available at `/admin/analytics`.

- **North star:** exchanges created in the 30-day window and completed by both parties.
- **Acceptance rate:** proposals created in the 30-day window that were accepted at least once.
- **Completion rate:** completed proposals divided by accepted proposals from the same creation window.
- **New cohort:** users registered in the last 30 days; each activation step is a unique user and is measured against registrations.
- **Speed to value:** median elapsed time for first listing, proposal acceptance, and accepted-to-completed exchange.
- Daily boundaries and dashboard timestamps use `Europe/Moscow`; database timestamps remain UTC.

Metrics are operational indicators, not billing-grade accounting. Thresholds in “Product signals” are initial internal guardrails and must be recalibrated after representative launch cohorts exist.

## Operations

Set `PRODUCT_ANALYTICS_ENABLED=true` in production. Events are retained for 180 days by default. Run the following command daily from the production scheduler:

```bash
npm run analytics:prune
```

Override retention with `PRODUCT_ANALYTICS_RETENTION_DAYS` between 30 and 730. Any change to collected fields, cookies, retention, or third-party sharing requires privacy and legal review before release.
