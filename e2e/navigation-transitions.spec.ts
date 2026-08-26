import { devices, expect, test, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";

const maria = { email: "maria@menarium.ru", password: "MenariumDemo2026!" };

function resetSeedData() {
  const result = spawnSync(process.execPath, ["prisma/seed.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, ALLOW_PROD_SEED: "true" },
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(`Seed reset failed:\n${result.stdout}\n${result.stderr}`);
}

async function login(page: Page) {
  await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Электронная почта").fill(maria.email);
  await page.getByLabel("Пароль").fill(maria.password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), {
    waitUntil: "commit",
    timeout: 30_000,
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
}

async function openFromNavigation(page: Page, href: string, mobile: boolean, fromScrolledPage: boolean) {
  if (fromScrolledPage) {
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(80);
  }

  const navigation = page.getByRole("navigation", {
    name: mobile ? "Мобильная навигация" : "Основная навигация",
  });
  // On phones the home action lives in the compact top bar rather than the dock.
  const link = mobile && href === "/"
    ? page.locator("header.mobile-navigation a[href='/']")
    : navigation.locator(`a[href="${href}"]`).first();
  await expect(link).toBeVisible();
  await link.click();
  await page.waitForURL((url) => url.pathname === href, { timeout: 30_000 });
  await page.waitForFunction(() => document.querySelectorAll("#main-content").length === 1);
  await expect(page.locator("#main-content h1, #main-content h2").first()).toBeVisible();

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
  const geometry = await page.evaluate((isMobile) => {
    const main = document.querySelector<HTMLElement>("#main-content h1, #main-content h2");
    const header = document.querySelector<HTMLElement>(isMobile ? ".mobile-navigation" : ".desktop-navigation");
    if (!main || !header) return null;
    return { mainTop: main.getBoundingClientRect().top, headerBottom: header.getBoundingClientRect().bottom };
  }, mobile);
  expect(geometry, `${href}: navigation or content is missing`).not.toBeNull();
  expect(geometry!.mainTop, `${href}: content starts under the fixed header`).toBeGreaterThanOrEqual(geometry!.headerBottom - 1);
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000, mobile: false },
  { name: "mobile", width: 390, height: 844, mobile: true },
]) {
  test(`main navigation opens each section from the top without a stale shell on ${viewport.name}`, async ({ browser }) => {
    test.setTimeout(180_000);
    resetSeedData();
    const context = await browser.newContext({
      viewport,
      screen: viewport,
      isMobile: viewport.mobile,
      hasTouch: viewport.mobile,
      userAgent: viewport.mobile ? devices["iPhone 13"].userAgent : undefined,
    });
    const page = await context.newPage();
    try {
      await login(page);
      for (const [href, fromScrolledPage] of [
        ["/catalog", true],
        ["/swipe", false],
        ["/exchange", false],
        ["/profile/chats", false],
        ["/", false],
      ] as const) {
        await openFromNavigation(page, href, viewport.mobile, fromScrolledPage);
      }
    } finally {
      await context.close();
    }
  });
}
