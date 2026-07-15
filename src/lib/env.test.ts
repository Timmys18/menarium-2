import { describe, expect, it } from "vitest";

import { validateProductionEnv } from "./env";

const productionEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://localhost/menarium",
  NEXTAUTH_SECRET: "a-production-secret-with-32-characters",
  NEXTAUTH_URL: "https://menarium.ru",
  NEXT_PUBLIC_APP_URL: "https://menarium.ru",
  REDIS_URL: "redis://localhost:6379",
  ADMIN_EMAILS: "admin@menarium.ru",
  SMTP_HOST: "smtp.example.test",
  SMTP_FROM: "Menarium <noreply@menarium.ru>",
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
});
