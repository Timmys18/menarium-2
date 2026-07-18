import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;
const tracesSampleRate = Number(
  process.env.SENTRY_TRACES_SAMPLE_RATE ?? (process.env.NODE_ENV === "production" ? 0.1 : 1),
);

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    release: process.env.APP_RELEASE,
    sendDefaultPii: false,
  });
}
