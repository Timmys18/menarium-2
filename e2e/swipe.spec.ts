import { expect, test, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";

const MARIA = {
  email: "maria@menarium.ru",
  password: "MenariumDemo2026!",
};

function resetSeedData() {
  const result = spawnSync(process.execPath, ["prisma/seed.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, ALLOW_PROD_SEED: "true" },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`Seed reset failed:\n${result.stdout}\n${result.stderr}`);
  }
}

async function login(page: Page) {
  await page.goto("/auth/login");
  const content = page.locator("main");
  await content.locator('input[type="email"]').filter({ visible: true }).first().fill(MARIA.email);
  const password = content.locator('input[type="password"]').filter({ visible: true }).first();
  await password.fill(MARIA.password);
  await password.press("Enter");
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 15_000 });
}

test.describe("swipe loop", () => {
  test.beforeEach(() => resetSeedData());

  test("pass persists and advances to the next card", async ({ page }) => {
    await login(page);
    await page.goto("/swipe");

    const currentCard = page.locator("main h2").first();
    await expect(currentCard).toBeVisible();
    const currentTitle = await currentCard.innerText();
    const passResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/items/swipe/pass") && response.request().method() === "POST",
    );

    await page.locator('main button[aria-label]').first().click();
    expect((await passResponse).status()).toBe(200);
    await expect(page.locator("main h2").first()).not.toHaveText(currentTitle);
  });
});
