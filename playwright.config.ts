import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";

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
    toHaveScreenshot: {
      // Ignore only isolated rasterization noise; layout and content changes still fail.
      maxDiffPixels: 10,
    },
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
  // `npm run test:e2e` owns the production server lifecycle on every platform.
  webServer: undefined,
});
