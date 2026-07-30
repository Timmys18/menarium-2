function assertProductionUrl(value: string | undefined, key: string, allowInsecureLocalhost: boolean) {
  let url: URL;

  try {
    url = new URL(value ?? "");
  } catch {
    throw new Error(`[env] ${key} must be a valid absolute URL`);
  }

  const localHttp = allowInsecureLocalhost && url.protocol === "http:" && url.hostname === "localhost";
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error(`[env] ${key} must use https in production`);
  }

  return url;
}

/** Fail fast before the production server accepts its first request. */
export function validateProductionEnv(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== "production") return;

  const required = [
    "APP_RELEASE",
    "APP_ENVIRONMENT",
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "APP_URL",
    "REDIS_URL",
    "ADMIN_EMAILS",
    "SMTP_HOST",
    "SMTP_FROM",
    "WEB_PUSH_SUBJECT",
    "NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY",
    "WEB_PUSH_PRIVATE_KEY",
    "PRODUCT_ANALYTICS_ENABLED",
    "SENTRY_DSN",
    "SENTRY_ENVIRONMENT",
  ] as const;
  const missing = required.filter((key) => !env[key]?.trim());

  if (missing.length) {
    throw new Error(`[env] Missing required variables: ${missing.join(", ")}`);
  }

  const isCi = env.CI === "true";
  const allowedEnvironments = isCi ? ["ci", "staging", "production"] : ["staging", "production"];
  if (!allowedEnvironments.includes(env.APP_ENVIRONMENT ?? "")) {
    throw new Error(`[env] APP_ENVIRONMENT must be one of: ${allowedEnvironments.join(", ")}`);
  }
  if (!isCi && new Set(["development", "unknown", "latest"]).has(env.APP_RELEASE?.toLowerCase() ?? "")) {
    throw new Error("[env] APP_RELEASE must identify an immutable production release");
  }

  if ((env.NEXTAUTH_SECRET?.length ?? 0) < 32) {
    throw new Error("[env] NEXTAUTH_SECRET must contain at least 32 characters");
  }
  if (!/^(mailto:|https:)/.test(env.WEB_PUSH_SUBJECT ?? "")) {
    throw new Error("[env] WEB_PUSH_SUBJECT must start with mailto: or https:");
  }
  if (
    (env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY?.length ?? 0) < 64 ||
    (env.WEB_PUSH_PRIVATE_KEY?.length ?? 0) < 32
  ) {
    throw new Error("[env] Web Push keys are invalid");
  }

  const authUrl = assertProductionUrl(env.NEXTAUTH_URL, "NEXTAUTH_URL", isCi);
  const publicUrl = assertProductionUrl(env.APP_URL, "APP_URL", isCi);
  if (authUrl.origin !== publicUrl.origin) {
    throw new Error("[env] NEXTAUTH_URL and APP_URL must use the same origin");
  }

  assertProductionUrl(env.SENTRY_DSN, "SENTRY_DSN", false);

  const tracesSampleRate = Number(env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1);
  if (!Number.isFinite(tracesSampleRate) || tracesSampleRate < 0 || tracesSampleRate > 1) {
    throw new Error("[env] SENTRY_TRACES_SAMPLE_RATE must be a number between 0 and 1");
  }

  if (!new Set(["true", "false"]).has(env.PRODUCT_ANALYTICS_ENABLED ?? "")) {
    throw new Error("[env] PRODUCT_ANALYTICS_ENABLED must be explicitly set to true or false");
  }

  const analyticsRetentionDays = Number(env.PRODUCT_ANALYTICS_RETENTION_DAYS ?? 180);
  if (!Number.isInteger(analyticsRetentionDays) || analyticsRetentionDays < 30 || analyticsRetentionDays > 730) {
    throw new Error("[env] PRODUCT_ANALYTICS_RETENTION_DAYS must be an integer between 30 and 730");
  }

  const localStorageInCi = isCi && env.STORAGE_PROVIDER === "local";
  if (env.STORAGE_PROVIDER !== "s3" && !localStorageInCi) {
    throw new Error("[env] STORAGE_PROVIDER must be s3 in production");
  }

  if (localStorageInCi) return;

  const s3Keys = [
    "STORAGE_ENDPOINT",
    "STORAGE_BUCKET",
    "STORAGE_REGION",
    "STORAGE_ACCESS_KEY_ID",
    "STORAGE_SECRET_ACCESS_KEY",
    "STORAGE_PUBLIC_BASE_URL",
  ] as const;
  const s3Missing = s3Keys.filter((key) => !env[key]?.trim());
  if (s3Missing.length) {
    throw new Error(`[env] Missing S3 variables: ${s3Missing.join(", ")}`);
  }
}
