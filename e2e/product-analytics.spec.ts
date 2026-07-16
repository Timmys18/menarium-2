import { PrismaClient } from "@prisma/client";
import { expect, test, type BrowserContext } from "@playwright/test";
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
      ).toBeGreaterThan(0);

      await page.goto("/catalog");
      await expect(page.getByRole("heading", { name: /Каталог/i })).toBeVisible();
      await expect.poll(
        () => prisma.productEvent.count({ where: { name: "page_view", actorId: maria.id, path: "/catalog" } }),
      ).toBeGreaterThan(0);

      const visibleItems = await prisma.item.findMany({
        where: { ownerId: { not: maria.id }, status: "ACTIVE" },
        orderBy: { id: "asc" },
        take: 2,
      });
      expect(visibleItems).toHaveLength(2);
      await page.goto(`/item/${visibleItems[0]!.id}`);
      await page.goto(`/item/${visibleItems[1]!.id}`);
      await expect.poll(
        () => prisma.productEvent.count({
          where: { name: "page_view", actorId: maria.id, path: "/item/[id]" },
        }),
      ).toBe(2);

      const title = `[E2E] Analytics ${Date.now()}`;
      const createItem = await context.request.post("/api/items", {
        data: {
          title,
          type: "THING",
          category: "Техника",
          description: "Объявление для проверки продуктовой аналитики Menarium.",
          city: "Москва",
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
      await expect(adminPage.getByRole("heading", { name: "Пульс Menarium" })).toBeVisible();
      await expect(adminPage.getByText("North star · 30 дней")).toBeVisible();
    } finally {
      await adminContext.close();
    }
  });
});
