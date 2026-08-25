import { devices, expect, test, type BrowserContext, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const MARIA = { email: "maria@menarium.ru", password: "MenariumDemo2026!" };
mkdirSync("docs/qa/product-candidate", { recursive: true });

type Fixture = { swapId: string; threadId: string };

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
  await page.getByLabel("Электронная почта").fill(MARIA.email);
  await page.getByLabel("Пароль").fill(MARIA.password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 30_000 });
  await page.close();
}

async function settle(page: Page) {
  await page.waitForFunction(() => document.querySelectorAll("#main-content").length === 1);
  await page.evaluate(async () => document.fonts.ready);
  await page.waitForTimeout(300);
}

async function capture(page: Page, name: string) {
  const mobileShell = await page.evaluate(() => {
    if (window.innerWidth < 768 && matchMedia("(any-pointer: coarse)").matches) {
      document.querySelectorAll<HTMLElement>(".desktop-navigation").forEach((element) => {
        element.style.setProperty("display", "none", "important");
      });
      document.querySelectorAll<HTMLElement>(".mobile-navigation").forEach((element) => {
        element.style.setProperty("display", "block", "important");
      });
      return true;
    }
    return false;
  });
  await page.screenshot({ path: `docs/qa/product-candidate/${name}-viewport.png` });
  if (mobileShell) {
    await page.getByRole("navigation", { name: "Мобильная навигация" }).evaluate((element) => {
      element.style.setProperty("display", "none", "important");
    });
  }
  await page.screenshot({ path: `docs/qa/product-candidate/${name}-full.png`, fullPage: true });
}

test("mobile chat, compact shell and active exchange stay task-first", async ({ browser }) => {
  test.setTimeout(180_000);
  const fixture = prepareFixture();

  for (const viewport of [
    { width: 320, height: 800 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport,
      screen: viewport,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
      userAgent: devices["iPhone 13"].userAgent,
      reducedMotion: "reduce",
    });
    await login(context);
    const suffix = `${viewport.width}x${viewport.height}`;
    const openMobilePage = async (path: string) => {
      const page = await context.newPage();
      await page.goto(path);
      await settle(page);
      await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(viewport.width);
      await expect.poll(() => page.evaluate(() => matchMedia("(any-pointer: coarse)").matches)).toBe(true);
      return page;
    };

    let page = await openMobilePage("/profile/chats");
    await expect(page.getByRole("link", { name: "В кабинет" })).toBeVisible();
    await expect(page.getByText("Личный кабинет", { exact: true })).toBeHidden();
    await capture(page, `compact-chats-${suffix}`);
    await page.close();

    page = await openMobilePage(`/profile/chats/item/${fixture.threadId}`);
    const composer = page.getByLabel("Текст сообщения");
    const send = page.getByRole("button", { name: "Отправить сообщение" });
    const mobileNavigation = page.getByRole("navigation", { name: "Мобильная навигация" });
    await expect(page.getByRole("heading", { name: "Дмитрий П." })).toBeVisible();
    await expect(page.getByRole("link", { name: /Canon AE-1/ })).toBeVisible();
    await expect(composer).toBeVisible();
    await expect(send).toBeVisible();
    await expect(mobileNavigation).toBeVisible();
    const [composerBox, navBox] = await Promise.all([composer.boundingBox(), mobileNavigation.boundingBox()]);
    expect(composerBox && navBox && composerBox.y + composerBox.height <= navBox.y).toBeTruthy();
    await capture(page, `item-chat-${suffix}`);
    await page.close();

    page = await openMobilePage(`/exchange?tab=matches&swap=${fixture.swapId}`);
    await expect(page.getByText("Вы отдаёте", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Вы получаете", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Открыть чат" })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Мобильная навигация" }).getByRole("link", { name: "Обмены", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await capture(page, `active-exchange-${suffix}`);
    await page.close();

    await context.close();
  }
});

test("tablet and desktop keep the same product hierarchy", async ({ browser }) => {
  test.setTimeout(180_000);
  const fixture = prepareFixture();

  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 1440, height: 1000 },
  ]) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    await login(context);
    const page = await context.newPage();
    const suffix = `${viewport.width}x${viewport.height}`;

    await page.goto(`/profile/chats/item/${fixture.threadId}`);
    await settle(page);
    await expect(page.getByLabel("Текст сообщения")).toBeVisible();
    await capture(page, `item-chat-${suffix}`);

    await page.goto(`/exchange?tab=matches&swap=${fixture.swapId}`);
    await settle(page);
    await expect(page.getByText("Этапы обмена", { exact: true })).toBeVisible();
    await capture(page, `active-exchange-${suffix}`);

    await context.close();
  }
});

test("public trust and recovery pages are ready for users", async ({ browser }) => {
  test.setTimeout(120_000);
  const viewports = [
    { width: 390, height: 844, mobile: true },
    { width: 1440, height: 1000, mobile: false },
  ];
  const routes = [
    { path: "/privacy", name: "privacy" },
    { path: "/terms", name: "terms" },
    { path: "/missing-product-page", name: "not-found" },
  ];

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport,
      screen: viewport,
      isMobile: viewport.mobile,
      hasTouch: viewport.mobile,
      deviceScaleFactor: 1,
      userAgent: viewport.mobile ? devices["iPhone 13"].userAgent : undefined,
      reducedMotion: "reduce",
    });
    for (const route of routes) {
      const page = await context.newPage();
      await page.goto(route.path);
      await settle(page);
      await expect(page.getByRole("link", { name: "support@menarium.ru" }).first()).toBeVisible();
      await capture(page, `${route.name}-${viewport.width}x${viewport.height}`);
      await page.close();
    }
    await context.close();
  }
});
