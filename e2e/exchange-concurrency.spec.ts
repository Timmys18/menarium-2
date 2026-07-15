import {
  ItemStatus,
  PrismaClient,
  SwapStatus,
  type Item,
} from "@prisma/client";
import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
} from "@playwright/test";
import { spawnSync } from "node:child_process";

const prisma = new PrismaClient();

const MARIA = { email: "maria@menarium.ru", password: "MenariumDemo2026!" };
const DMITRY = { email: "dmitry@menarium.ru", password: "MenariumDemo2026!" };

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
  await page.locator('input[type="email"]').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.locator('input[type="password"]').press("Enter");
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 15_000 });
  await page.close();
}

async function fixtureItems() {
  const [maria, dmitry] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: MARIA.email } }),
    prisma.user.findUniqueOrThrow({ where: { email: DMITRY.email } }),
  ]);
  const [mariaItem, dmitryItem] = await Promise.all([
    prisma.item.findFirstOrThrow({ where: { ownerId: maria.id, status: ItemStatus.ACTIVE } }),
    prisma.item.findFirstOrThrow({ where: { ownerId: dmitry.id, status: ItemStatus.ACTIVE } }),
  ]);
  return { maria, dmitry, mariaItem, dmitryItem };
}

async function createSwap(
  request: APIRequestContext,
  senderItem: Pick<Item, "id">,
  receiverItem: Pick<Item, "id">,
) {
  const response = await request.post("/api/exchange", {
    data: { senderItemId: senderItem.id, receiverItemId: receiverItem.id },
  });
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBe(201);
  return body.data.id as string;
}

async function swapAction(request: APIRequestContext, swapId: string, action: string) {
  return request.patch("/api/exchange", { data: { swapId, action } });
}

test.describe("exchange transaction invariants", () => {
  test.beforeEach(async ({}, testInfo) => {
    testInfo.setTimeout(120_000);
    resetSeedData();
    await new Promise((resolve) => setTimeout(resolve, 3_100));
  });
  test.afterAll(() => prisma.$disconnect());

  test("reciprocal offers coexist and become a match for both users", async ({ browser }) => {
    const mariaContext = await browser.newContext();
    const dmitryContext = await browser.newContext();

    try {
      await Promise.all([login(mariaContext, MARIA), login(dmitryContext, DMITRY)]);
      const { mariaItem, dmitryItem } = await fixtureItems();

      const mariaOfferId = await createSwap(mariaContext.request, mariaItem, dmitryItem);
      const dmitryOfferId = await createSwap(dmitryContext.request, dmitryItem, mariaItem);

      const rows = await prisma.swapRequest.findMany({
        where: { id: { in: [mariaOfferId, dmitryOfferId] } },
        orderBy: { senderItemId: "asc" },
      });
      expect(rows).toHaveLength(2);
      expect(new Set(rows.map((row) => row.pendingPairKey))).toEqual(
        new Set([
          `${mariaItem.id}->${dmitryItem.id}`,
          `${dmitryItem.id}->${mariaItem.id}`,
        ]),
      );

      const [mariaInbox, dmitryInbox] = await Promise.all([
        mariaContext.request.get("/api/exchange/my?limit=50"),
        dmitryContext.request.get("/api/exchange/my?limit=50"),
      ]);
      expect((await mariaInbox.json()).matches.map((swap: { id: string }) => swap.id)).toEqual([
        dmitryOfferId,
      ]);
      expect((await dmitryInbox.json()).matches.map((swap: { id: string }) => swap.id)).toEqual([
        mariaOfferId,
      ]);
    } finally {
      await mariaContext.close();
      await dmitryContext.close();
    }
  });

  test("accept and decline cannot both commit", async ({ browser }) => {
    const mariaContext = await browser.newContext();
    const dmitryContext = await browser.newContext();

    try {
      await Promise.all([login(mariaContext, MARIA), login(dmitryContext, DMITRY)]);
      const { mariaItem, dmitryItem } = await fixtureItems();
      const swapId = await createSwap(mariaContext.request, mariaItem, dmitryItem);

      const responses = await Promise.all([
        swapAction(dmitryContext.request, swapId, "accept"),
        swapAction(dmitryContext.request, swapId, "decline"),
      ]);
      expect(responses.map((response) => response.status()).sort()).toEqual([200, 409]);

      const swap = await prisma.swapRequest.findUniqueOrThrow({ where: { id: swapId } });
      const items = await prisma.item.findMany({
        where: { id: { in: [mariaItem.id, dmitryItem.id] } },
        select: { status: true },
      });
      const expectedItemStatus =
        swap.status === SwapStatus.ACCEPTED ? ItemStatus.IN_DEAL : ItemStatus.ACTIVE;
      expect([SwapStatus.ACCEPTED, SwapStatus.DECLINED]).toContain(swap.status);
      expect(items.every((item) => item.status === expectedItemStatus)).toBe(true);
    } finally {
      await mariaContext.close();
      await dmitryContext.close();
    }
  });

  test("simultaneous completion keeps both confirmations", async ({ browser }) => {
    const mariaContext = await browser.newContext();
    const dmitryContext = await browser.newContext();

    try {
      await Promise.all([login(mariaContext, MARIA), login(dmitryContext, DMITRY)]);
      const { mariaItem, dmitryItem } = await fixtureItems();
      const swapId = await createSwap(mariaContext.request, mariaItem, dmitryItem);
      const accepted = await swapAction(dmitryContext.request, swapId, "accept");
      const acceptedBody = await accepted.json();
      expect(accepted.status(), JSON.stringify(acceptedBody)).toBe(200);

      const completed = await Promise.all([
        swapAction(mariaContext.request, swapId, "complete"),
        swapAction(dmitryContext.request, swapId, "complete"),
      ]);
      expect(completed.map((response) => response.status())).toEqual([200, 200]);

      const swap = await prisma.swapRequest.findUniqueOrThrow({ where: { id: swapId } });
      expect(swap).toMatchObject({
        status: SwapStatus.COMPLETED,
        senderCompleted: true,
        receiverCompleted: true,
      });
      const items = await prisma.item.findMany({
        where: { id: { in: [mariaItem.id, dmitryItem.id] } },
        select: { status: true },
      });
      expect(items.every((item) => item.status === ItemStatus.ARCHIVED)).toBe(true);
    } finally {
      await mariaContext.close();
      await dmitryContext.close();
    }
  });
});
