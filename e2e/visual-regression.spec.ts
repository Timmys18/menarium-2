import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";

const maria = { email: "maria@menarium.ru", password: "MenariumDemo2026!" };

type Fixture = { ownItemId: string; otherItemId: string; swapId: string; threadId: string };

function prepareFixture(): Fixture {
  const seed = spawnSync(process.execPath, ["prisma/seed.mjs"], {
    cwd: process.cwd(), env: { ...process.env, ALLOW_PROD_SEED: "true" }, encoding: "utf8",
  });
  if (seed.status !== 0) throw new Error(`Seed reset failed:\n${seed.stdout}\n${seed.stderr}`);
  const fixture = spawnSync(process.execPath, ["scripts/create-ui-acceptance-fixture.mjs"], {
    cwd: process.cwd(), env: process.env, encoding: "utf8",
  });
  if (fixture.status !== 0) throw new Error(`Fixture creation failed:\n${fixture.stdout}\n${fixture.stderr}`);
  return JSON.parse(fixture.stdout) as Fixture;
}

async function login(context: BrowserContext) {
  const page = await context.newPage();
  await page.goto("/auth/login");
  await page.getByLabel("Электронная почта").fill(maria.email);
  await page.getByLabel("Пароль").fill(maria.password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), {
    waitUntil: "commit",
    timeout: 30_000,
  });
  await page.close();
}

async function settle(page: Page) {
  await page.waitForFunction(() => document.querySelectorAll("#main-content").length === 1);
  await page.waitForTimeout(150);
  await expect(page.locator("#main-content")).toHaveCount(1);
  await page.locator("#main-content").first().waitFor({ state: "visible" });
  await page.evaluate(async () => document.fonts.ready);
  await page.waitForFunction(() =>
    Array.from(document.images)
      .filter((image) => {
        const rect = image.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
      })
      .every((image) => image.complete && image.naturalWidth > 0),
  );
  await page.waitForTimeout(250);
}

async function open(page: Page, route: string) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await settle(page);
}

test.describe("visual regression", () => {
  test("desktop product surfaces", async ({ browser }) => {
    test.setTimeout(300_000);
    const fixture = prepareFixture();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    const publicPage = await context.newPage();
    await open(publicPage, "/auth/login");
    await expect(publicPage).toHaveScreenshot("desktop-login.png", { animations: "disabled" });
    await publicPage.close();
    await login(context);
    const page = await context.newPage();

    await open(page, "/");
    await expect(page).toHaveScreenshot("desktop-home.png", { animations: "disabled" });
    await open(page, "/catalog");
    await page.getByRole("button", { name: /Выберите город/ }).click();
    await expect(page.getByRole("textbox", { name: "Найти город в списке" })).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("desktop-catalog-filter.png", {
      animations: "disabled",
      // Windows rasterizes focused list text with a repeatable subpixel variance.
      maxDiffPixels: 600,
    });
    await open(page, `/item/${fixture.otherItemId}`);
    await page.locator("#exchange-sender-item").selectOption(fixture.ownItemId);
    await expect(page).toHaveScreenshot("desktop-item.png", { animations: "disabled" });
    await open(page, "/profile");
    await expect(page).toHaveScreenshot("desktop-profile.png", { animations: "disabled" });
    await open(page, `/profile/chats/item/${fixture.threadId}`);
    await expect(page).toHaveScreenshot("desktop-chat.png", {
      animations: "disabled",
      mask: [page.locator("time")],
      maskColor: "#13202f",
      maxDiffPixels: 10,
    });
    await open(page, `/exchange?tab=matches&swap=${fixture.swapId}`);
    await expect(page).toHaveScreenshot("desktop-exchange.png", { animations: "disabled" });
    await context.close();
  });

  test("mobile product surfaces and dialog", async ({ browser }) => {
    test.setTimeout(180_000);
    const fixture = prepareFixture();
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce",
    });
    const publicPage = await context.newPage();
    await open(publicPage, "/auth/register");
    await expect(publicPage).toHaveScreenshot("mobile-register.png", { animations: "disabled" });
    await publicPage.close();
    await login(context);
    const page = await context.newPage();

    await open(page, "/profile");
    await expect(page).toHaveScreenshot("mobile-profile.png", { animations: "disabled" });
    const pause = page.getByRole("button", { name: "Поставить объявление на паузу" }).first();
    await pause.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page).toHaveScreenshot("mobile-pause-dialog.png", { animations: "disabled" });
    await page.keyboard.press("Escape");
    await open(page, `/profile/chats/item/${fixture.threadId}`);
    await expect(page).toHaveScreenshot("mobile-chat.png", {
      animations: "disabled",
      mask: [page.locator("time")],
      maskColor: "#13202f",
      maxDiffPixels: 10,
    });
    await open(page, `/exchange?tab=matches&swap=${fixture.swapId}`);
    await expect(page).toHaveScreenshot("mobile-exchange.png", { animations: "disabled" });
    await open(page, "/profile/safety");
    await expect(page).toHaveScreenshot("mobile-empty-safety.png", { animations: "disabled" });
    await context.close();
  });
});
