import { PrismaClient } from "@prisma/client";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";

const prisma = new PrismaClient();

const MARIA = {
  email: "maria@menarium.ru",
  password: "MenariumDemo2026!",
};

const ADMIN = {
  email: "admin@menarium.ru",
  password: "MenariumAdmin2026!",
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

async function login(context: BrowserContext, credentials: typeof MARIA) {
  const page = await context.newPage();
  await page.goto("/auth/login");
  const content = page.locator("main");
  await content.locator('input[type="email"]').filter({ visible: true }).first().fill(credentials.email);
  const password = content.locator('input[type="password"]').filter({ visible: true }).first();
  await password.fill(credentials.password);
  await password.press("Enter");
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 15_000 });
  return page;
}

async function gotoAndWaitForPageView(page: Page, url: string, expectedPath: string) {
  const analyticsResponse = page.waitForResponse(
    (response) => {
      if (!response.url().endsWith("/api/analytics/events") || response.request().method() !== "POST") {
        return false;
      }

      try {
        const payload = response.request().postDataJSON() as { name?: string; path?: string };
        return payload.name === "page_view" && payload.path === expectedPath;
      } catch {
        return false;
      }
    },
    { timeout: 20_000 },
  );

  await page.goto(url, { waitUntil: "domcontentloaded" });
  expect((await analyticsResponse).status()).toBe(202);
}

test.describe("privacy-first product analytics", () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.setTimeout(90_000);
    resetSeedData();
  });

  test.afterAll(() => prisma.$disconnect());

  test("records the activation path from login to exchange proposal", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await login(context, MARIA);
    const maria = await prisma.user.findUniqueOrThrow({ where: { email: MARIA.email } });

    try {
      await expect.poll(
        () => prisma.productEvent.count({ where: { name: "login_succeeded", actorId: maria.id } }),
        { timeout: 15_000 },
      ).toBeGreaterThan(0);

      await gotoAndWaitForPageView(page, "/catalog", "/catalog");
      await expect(page.getByRole("heading", { name: "Найди встречный вариант" })).toBeVisible();
      await expect.poll(
        () => prisma.productEvent.count({ where: { name: "page_view", actorId: maria.id, path: "/catalog" } }),
        { timeout: 15_000 },
      ).toBeGreaterThan(0);

      const visibleItems = await prisma.item.findMany({
        where: { ownerId: { not: maria.id }, status: "ACTIVE" },
        orderBy: { id: "asc" },
        take: 2,
      });
      expect(visibleItems).toHaveLength(2);
      await gotoAndWaitForPageView(page, `/item/${visibleItems[0]!.id}`, "/item/[id]");
      await gotoAndWaitForPageView(page, `/item/${visibleItems[1]!.id}`, "/item/[id]");
      await expect.poll(
        () => prisma.productEvent.count({
          where: { name: "page_view", actorId: maria.id, path: "/item/[id]" },
        }),
        { timeout: 15_000 },
      ).toBe(2);

      const title = `[E2E] Analytics ${Date.now()}`;
      const createItem = await context.request.post("/api/items", {
        data: {
          title,
          type: "THING",
          categoryId: "thing.electronics.audio",
          description: "Объявление для проверки продуктовой аналитики Menarium.",
          cityId: "москва-москва",
          isOnline: false,
          desired: ["Книги"],
          acceptsAnything: false,
          extraOfferText: "",
          images: [],
        },
      });
      expect(createItem.status(), await createItem.text()).toBe(201);
      const createdItem = (await createItem.json()).data as { id: string };

      await expect.poll(
        () => prisma.productEvent.count({
          where: { name: "item_created", actorId: maria.id, entityId: createdItem.id },
        }),
        { timeout: 15_000 },
      ).toBe(1);

      const targetItem = await prisma.item.findFirstOrThrow({
        where: { ownerId: { not: maria.id }, status: "ACTIVE" },
      });
      const propose = await context.request.post("/api/exchange", {
        data: { senderItemId: createdItem.id, receiverItemId: targetItem.id },
      });
      expect(propose.status(), await propose.text()).toBe(201);
      const swap = (await propose.json()).data as { id: string };

      await expect.poll(
        () => prisma.productEvent.count({
          where: { name: "swap_proposed", actorId: maria.id, entityId: swap.id },
        }),
        { timeout: 15_000 },
      ).toBe(1);
    } finally {
      await context.close();
    }
  });

  test("keeps the product dashboard private and available to admins", async ({ browser, page }) => {
    await page.goto("/admin/analytics");
    await expect(page.getByRole("heading", { name: "Доступ только для администратора" })).toBeVisible();

    const adminContext = await browser.newContext();
    try {
      const adminPage = await login(adminContext, ADMIN);
      await adminPage.goto("/admin/analytics");
      await expect(adminPage.getByRole("heading", { name: "Пульс Менариум" })).toBeVisible();
      await expect(adminPage.getByText("North star · 30 дней").filter({ visible: true })).toBeVisible();
    } finally {
      await adminContext.close();
    }
  });
});
