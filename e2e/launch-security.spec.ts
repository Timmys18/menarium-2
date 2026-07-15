import { ItemStatus, PrismaClient } from "@prisma/client";
import { expect, test, type BrowserContext } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { createAuthToken, passwordResetIdentifier } from "../src/lib/auth-tokens";

const prisma = new PrismaClient();

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

async function login(context: BrowserContext) {
  const page = await context.newPage();
  await page.goto("/auth/login");
  const content = page.locator("main");
  await content.locator('input[type="email"]').filter({ visible: true }).first().fill(MARIA.email);
  const password = content.locator('input[type="password"]').filter({ visible: true }).first();
  await password.fill(MARIA.password);
  await password.press("Enter");
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 15_000 });
  await page.close();
}

test.describe("launch security boundaries", () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.setTimeout(120_000);
    resetSeedData();
  });
  test.afterAll(() => prisma.$disconnect());

  test("archived items are private but remain inspectable by their owner", async ({ browser, request }) => {
    const maria = await prisma.user.findUniqueOrThrow({ where: { email: MARIA.email } });
    const item = await prisma.item.findFirstOrThrow({
      where: { ownerId: maria.id, status: ItemStatus.ACTIVE },
    });
    await prisma.item.update({ where: { id: item.id }, data: { status: ItemStatus.ARCHIVED } });

    expect((await request.get(`/api/items/${item.id}`)).status()).toBe(404);
    const anonymousPage = await browser.newPage();
    await anonymousPage.goto(`/item/${item.id}`);
    await expect(anonymousPage.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
    await anonymousPage.close();

    const ownerContext = await browser.newContext();
    try {
      await login(ownerContext);
      const ownerResponse = await ownerContext.request.get(`/api/items/${item.id}`);
      expect(ownerResponse.status()).toBe(200);
      expect((await ownerResponse.json()).data.status).toBe(ItemStatus.ARCHIVED);
    } finally {
      await ownerContext.close();
    }
  });

  test("password change revokes the current session", async ({ browser }) => {
    const context = await browser.newContext();
    try {
      await login(context);
      const before = await prisma.user.findUniqueOrThrow({ where: { email: MARIA.email } });
      const response = await context.request.patch("/api/users/me/password", {
        data: {
          currentPassword: MARIA.password,
          newPassword: "MenariumDemo2027!",
        },
      });
      expect(response.status(), await response.text()).toBe(200);

      const after = await prisma.user.findUniqueOrThrow({ where: { email: MARIA.email } });
      expect(after.sessionVersion).toBe(before.sessionVersion + 1);
      expect((await context.request.get("/api/inbox/counts")).status()).toBe(401);
    } finally {
      await context.close();
    }
  });

  test("reset tokens are hashed at rest and consumed with the password update", async ({ request }) => {
    const before = await prisma.user.findUniqueOrThrow({ where: { email: MARIA.email } });
    const identifier = passwordResetIdentifier(MARIA.email);
    const token = await createAuthToken(identifier, 1);
    const stored = await prisma.verificationToken.findFirstOrThrow({ where: { identifier } });

    expect(stored.token).not.toBe(token);
    expect(stored.token).toMatch(/^[a-f0-9]{64}$/);

    const response = await request.post("/api/auth/reset-password", {
      data: { email: MARIA.email, token, password: "MenariumReset2027!" },
    });
    expect(response.status(), await response.text()).toBe(200);

    const after = await prisma.user.findUniqueOrThrow({ where: { email: MARIA.email } });
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);
    expect(await prisma.verificationToken.findFirst({ where: { identifier } })).toBeNull();
  });
});
