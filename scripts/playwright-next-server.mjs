import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const port = process.env.PORT ?? "3001";
const nextAuthSecret = (process.env.NEXTAUTH_SECRET?.length ?? 0) >= 32
  ? process.env.NEXTAUTH_SECRET
  : "local-acceptance-secret-32-characters-minimum";
const standaloneRoot = path.join(process.cwd(), ".next", "standalone");
if (!existsSync(path.join(standaloneRoot, "server.js"))) {
  throw new Error("Production build is missing. Run `npm run build` before Playwright.");
}

const publicSource = path.join(process.cwd(), "public");
const publicTarget = path.join(standaloneRoot, "public");
rmSync(publicTarget, { recursive: true, force: true });
cpSync(publicSource, publicTarget, {
  recursive: true,
  filter(source) {
    const relative = path.relative(publicSource, source);
    return relative !== "uploads" && !relative.startsWith(`uploads${path.sep}`);
  },
});
mkdirSync(path.join(publicTarget, "uploads"), { recursive: true });

const staticSource = path.join(process.cwd(), ".next", "static");
const staticTarget = path.join(standaloneRoot, ".next", "static");
rmSync(staticTarget, { recursive: true, force: true });
mkdirSync(path.dirname(staticTarget), { recursive: true });
cpSync(staticSource, staticTarget, { recursive: true });

Object.assign(process.env, {
  CI: process.env.CI ?? "true",
  APP_ENVIRONMENT: process.env.APP_ENVIRONMENT ?? "ci",
  APP_RELEASE: process.env.APP_RELEASE ?? "local-acceptance",
  HOSTNAME: "127.0.0.1",
  PORT: port,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? `http://localhost:${port}`,
  APP_URL: process.env.APP_URL ?? `http://localhost:${port}`,
  NEXTAUTH_SECRET: nextAuthSecret,
  REDIS_URL: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  SMTP_HOST: process.env.SMTP_HOST ?? "127.0.0.1",
  SMTP_FROM: process.env.SMTP_FROM ?? "Menarium <noreply@menarium.ru>",
  SENTRY_DSN: process.env.SENTRY_DSN ?? "https://public@example.com/1",
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT ?? "ci",
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER ?? "local",
  E2E_TEST_MODE: "true",
  E2E_TEST_RESET_KEY: process.env.E2E_TEST_RESET_KEY ?? "local-e2e-reset-key",
});

process.chdir(standaloneRoot);
await import(pathToFileURL(path.join(standaloneRoot, "server.js")).href);
