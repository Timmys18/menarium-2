import { expect, test, type Locator, type Page } from "@playwright/test";
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

function pick(locator: Locator) {
  return locator.filter({ visible: true }).first();
}

async function login(page: Page) {
  await page.goto("/auth/login");
  await pick(page.getByLabel("Электронная почта")).fill(MARIA.email);
  await pick(page.getByLabel("Пароль")).fill(MARIA.password);
  await pick(page.getByRole("button", { name: "Войти" })).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), {
    waitUntil: "commit",
    timeout: 30_000,
  });
}

async function waitForStableAccountShell(page: Page) {
  await page.waitForFunction(() => document.querySelectorAll("#main-content").length === 1);
  await expect(page.locator("#main-content")).toHaveCount(1);
  await expect(page.locator("#main-content").getByText("Личный кабинет", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Разделы личного кабинета" })).toBeVisible();
}

test.describe("единый каркас личного кабинета", () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.setTimeout(120_000);
    resetSeedData();
  });

  test("не теряет профиль и меню между разделами", async ({ page }) => {
    await login(page);
    await page.goto("/profile");

    await waitForStableAccountShell(page);
    const accountHeader = page.locator("#main-content").getByText("Личный кабинет", { exact: true });
    const accountNavigation = page.getByRole("navigation", { name: "Разделы личного кабинета" });
    await expect(accountHeader).toBeVisible();
    await expect(accountNavigation).toBeVisible();
    await page.evaluate(() => {
      (window as Window & { __accountShellMarker?: string }).__accountShellMarker = "preserved";
    });

    await page.getByRole("link", { name: /В обмене/ }).click();
    await expect(page).toHaveURL(/\/profile\?status=deal/);
    await waitForStableAccountShell(page);
    await expect(accountHeader).toBeVisible();
    await expect(accountNavigation).toBeVisible();
    await expect(page.getByRole("link", { name: /В обмене/ })).toHaveAttribute("aria-current", "page");
    await expect.poll(() => page.evaluate(() => (window as Window & { __accountShellMarker?: string }).__accountShellMarker)).toBe("preserved");

    for (const [label, path] of [
      ["Сообщения", "/profile/chats"],
      ["Обмены", "/profile/exchanges"],
      ["Избранное", "/profile/favorites"],
      ["Профиль и настройки", "/profile/edit"],
      ["Безопасность", "/profile/safety"],
      ["Мои объявления", "/profile"],
    ] as const) {
      await accountNavigation.getByRole("link", { name: new RegExp(label) }).click();
      await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}(?:\\?|$)`));
      await waitForStableAccountShell(page);
      await expect(accountHeader).toBeVisible();
      await expect(accountNavigation).toBeVisible();
      await expect.poll(() => page.evaluate(() => (window as Window & { __accountShellMarker?: string }).__accountShellMarker)).toBe("preserved");
    }

    await expect(page.getByRole("heading", { name: "Мои объявления" })).toBeVisible();
    await expect(page.getByText("Sony WH-1000XM5", { exact: true })).toBeVisible();
    await page.screenshot({ path: "test-results/account-shell-desktop.png", fullPage: true });
  });

  test("сохраняет аккуратный кабинет на мобильном экране", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    try {
      await login(page);
      await page.goto("/profile?status=deal");

      await expect(pick(page.getByText("Личный кабинет", { exact: true }))).toBeVisible();
      await expect(page.getByRole("heading", { name: "Мои объявления" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Разделы личного кабинета" })).toBeHidden();
      await expect(page.getByRole("navigation", { name: "Мобильная навигация" })).toBeVisible();
      await expect(pick(page.getByRole("link", { name: "Менариум — главная" }))).toBeVisible();
      await page.screenshot({ path: "test-results/account-shell-mobile-viewport.png" });
    } finally {
      await context.close();
    }
  });
});
