import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";
const useExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  failOnFlakyTests: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // E2E specs reset the same deterministic database fixtures.
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "list",
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Local failure videos can consume several gigabytes and hide the real result.
    // CI keeps them for investigation; a local run keeps screenshots and trace instead.
    video: process.env.CI ? "retain-on-failure" : "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.CI || useExternalServer
    ? undefined
    : {
        command: "npm run dev -- --port 3001",
        url: baseURL,
        reuseExistingServer: false,
        // The first Next development build on Windows can exceed two minutes.
        timeout: 300_000,
        env: {
          ...process.env,
          NEXT_DIST_DIR: ".next-e2e",
          NEXTAUTH_URL: baseURL,
          APP_URL: baseURL,
          E2E_TEST_MODE: "true",
          E2E_TEST_RESET_KEY: "local-e2e-reset-key",
        },
      },
});
