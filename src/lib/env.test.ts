import { describe, expect, it } from "vitest";

import { validateProductionEnv } from "./env";

const productionEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  APP_RELEASE: "abc123def456",
  APP_ENVIRONMENT: "production",
  DATABASE_URL: "postgresql://localhost/menarium",
  NEXTAUTH_SECRET: "a-production-secret-with-32-characters",
  NEXTAUTH_URL: "https://menarium.ru",
  APP_URL: "https://menarium.ru",
  REDIS_URL: "redis://localhost:6379",
  ADMIN_EMAILS: "admin@menarium.ru",
  SMTP_HOST: "smtp.example.test",
  SMTP_FROM: "Menarium <noreply@menarium.ru>",
  WEB_PUSH_SUBJECT: "mailto:support@menarium.ru",
  NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY:
    "BItNuCakjxFOumn76s9LkhcK40FFZK6ezBVmE3H3Wt4IImuYHLQKPRzZNEkWX69dUh80dVTutNJgr1qpqHH3WFE",
  WEB_PUSH_PRIVATE_KEY: "_5Y7T2ph2DRygpj3Fwv_ANTx6nPeE-o4oXr7GCYT-r0",
  PRODUCT_ANALYTICS_ENABLED: "true",
  SENTRY_DSN: "https://public@example.test/1",
  SENTRY_ENVIRONMENT: "production",
};

describe("validateProductionEnv", () => {
  it("skips validation outside production", () => {
    expect(() => validateProductionEnv({ NODE_ENV: "test" })).not.toThrow();
  });

  it("rejects local storage in a real production runtime", () => {
    expect(() =>
      validateProductionEnv({
        ...productionEnv,
        STORAGE_PROVIDER: "local",
      }),
    ).toThrow("STORAGE_PROVIDER");
  });

  it("allows local storage only in the isolated CI runtime", () => {
    expect(() =>
      validateProductionEnv({
        ...productionEnv,
        CI: "true",
        STORAGE_PROVIDER: "local",
      }),
    ).not.toThrow();
  });

  it("requires an immutable release identifier outside CI", () => {
    expect(() =>
      validateProductionEnv({
        ...productionEnv,
        APP_RELEASE: "latest",
        STORAGE_PROVIDER: "s3",
      }),
    ).toThrow("APP_RELEASE");
  });

  it("requires matching HTTPS application URLs outside CI", () => {
    expect(() =>
      validateProductionEnv({
        ...productionEnv,
        NEXTAUTH_URL: "http://menarium.ru",
        STORAGE_PROVIDER: "s3",
      }),
    ).toThrow("https");

    expect(() =>
      validateProductionEnv({
        ...productionEnv,
        APP_URL: "https://www.menarium.ru",
        STORAGE_PROVIDER: "s3",
      }),
    ).toThrow("same origin");
  });

  it("requires the complete S3 configuration in production", () => {
    expect(() =>
      validateProductionEnv({
        ...productionEnv,
        STORAGE_PROVIDER: "s3",
      }),
    ).toThrow("STORAGE_ENDPOINT");

    expect(() =>
      validateProductionEnv({
        ...productionEnv,
        STORAGE_PROVIDER: "s3",
        STORAGE_ENDPOINT: "https://storage.example.test",
        STORAGE_BUCKET: "menarium",
        STORAGE_REGION: "ru-central1",
        STORAGE_ACCESS_KEY_ID: "access-key",
        STORAGE_SECRET_ACCESS_KEY: "secret-key",
        STORAGE_PUBLIC_BASE_URL: "https://cdn.example.test",
      }),
    ).not.toThrow();
  });

  it("requires an explicit analytics mode and valid retention", () => {
    expect(() =>
      validateProductionEnv({
        ...productionEnv,
        PRODUCT_ANALYTICS_ENABLED: "yes",
        CI: "true",
        STORAGE_PROVIDER: "local",
      }),
    ).toThrow("PRODUCT_ANALYTICS_ENABLED");

    expect(() =>
      validateProductionEnv({
        ...productionEnv,
        PRODUCT_ANALYTICS_RETENTION_DAYS: "7",
        CI: "true",
        STORAGE_PROVIDER: "local",
      }),
    ).toThrow("PRODUCT_ANALYTICS_RETENTION_DAYS");
  });
});
