type LogContext = Record<string, string | number | boolean | null | undefined>;

const REDACTED_KEY = /authorization|cookie|dsn|email|password|secret|token/i;

function sanitizeString(value: string) {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b(postgres(?:ql)?|redis):\/\/[^@\s]+@/gi, "$1://[redacted]@");
}

function sanitizeContext(context: LogContext) {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => {
      if (REDACTED_KEY.test(key)) return [key, "[redacted]"];
      return [key, typeof value === "string" ? sanitizeString(value) : value];
    }),
  );
}

function errorDetails(error: unknown) {
  if (!(error instanceof Error)) return { errorType: typeof error };

  const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
  return {
    errorName: error.name,
    errorCode: code,
    errorMessage: sanitizeString(error.message),
    ...(process.env.NODE_ENV === "production" ? {} : { errorStack: error.stack }),
  };
}

function write(level: "info" | "warn" | "error", event: string, context: LogContext, error?: unknown) {
  const entry = JSON.stringify({
    time: new Date().toISOString(),
    level,
    event,
    service: "menarium-2",
    release: process.env.APP_RELEASE ?? "development",
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "unknown",
    ...sanitizeContext(context),
    ...(error === undefined ? {} : errorDetails(error)),
  });

  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export function logInfo(event: string, context: LogContext = {}) {
  write("info", event, context);
}

export function logWarn(event: string, context: LogContext = {}) {
  write("warn", event, context);
}

export function reportError(event: string, error: unknown, context: LogContext = {}) {
  write("error", event, context, error);

  if (!process.env.SENTRY_DSN) return;
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.captureException(error, {
      tags: {
        event,
        release: process.env.APP_RELEASE ?? "development",
      },
      extra: sanitizeContext(context),
    });
  });
}
