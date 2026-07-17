import { ItemStatus, NotificationType, PrismaClient, SwapStatus } from "@prisma/client";
import { expect, test, type BrowserContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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

test.describe("chat history and media hardening", () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.setTimeout(120_000);
    resetSeedData();
  });
  test.afterAll(() => prisma.$disconnect());

  test("shows the latest deal messages, loads older history, and appends a sent message immediately", async ({ browser }) => {
    const maria = await prisma.user.findUniqueOrThrow({ where: { email: MARIA.email } });
    const dmitry = await prisma.user.findUniqueOrThrow({ where: { email: "dmitry@menarium.ru" } });
    const mariaItem = await prisma.item.findFirstOrThrow({ where: { ownerId: maria.id } });
    const dmitryItem = await prisma.item.findFirstOrThrow({ where: { ownerId: dmitry.id } });
    const oldActivity = new Date(Date.now() - 60_000);
    const swap = await prisma.swapRequest.create({
      data: {
        status: SwapStatus.ACCEPTED,
        senderId: maria.id,
        receiverId: dmitry.id,
        senderItemId: mariaItem.id,
        receiverItemId: dmitryItem.id,
        acceptedAt: oldActivity,
        expiresAt: new Date(oldActivity.getTime() + 7 * 24 * 60 * 60 * 1000),
        updatedAt: oldActivity,
      },
    });
    await prisma.dealMessage.createMany({
      data: Array.from({ length: 45 }, (_, index) => ({
        swapId: swap.id,
        senderId: index % 2 === 0 ? dmitry.id : maria.id,
        text: `[E2E history] ${String(index + 1).padStart(2, "0")}`,
        createdAt: new Date(oldActivity.getTime() + index * 500),
      })),
    });
    const notification = await prisma.notification.create({
      data: {
        userId: maria.id,
        type: NotificationType.DEAL_MESSAGE_RECEIVED,
        title: "Новое сообщение в обмене",
        message: "Проверка unread.",
        href: `/exchange?swap=${swap.id}`,
        entityType: "SwapRequest",
        entityId: swap.id,
      },
    });

    const context = await browser.newContext();
    try {
      await login(context);
      const page = await context.newPage();
      await page.goto(`/exchange?swap=${swap.id}`);
      const main = page.locator("main");
      const messageLog = main.getByRole("log", { name: "Сообщения чата" });

      await expect(messageLog.getByText("[E2E history] 45", { exact: true })).toHaveCount(1);
      await expect(messageLog.getByText("[E2E history] 45", { exact: true })).toBeVisible();
      await expect(messageLog.getByText("[E2E history] 01", { exact: true })).toHaveCount(0);
      await messageLog.getByRole("button", { name: "Показать ранние сообщения" }).click();
      await expect(messageLog.getByText("[E2E history] 01", { exact: true })).toBeVisible();

      const sentText = "[E2E history] Отправлено без перезагрузки";
      const input = main.getByRole("textbox", { name: "Текст сообщения" });
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/exchange/${swap.id}/messages`) &&
          response.request().method() === "POST",
      );
      await input.fill(sentText);
      await input.press("Enter");
      const response = await responsePromise;
      expect(response.status(), await response.text()).toBe(201);
      await expect(messageLog.getByText(sentText, { exact: true })).toBeVisible();

      await expect.poll(async () => {
        return (await prisma.notification.findUniqueOrThrow({ where: { id: notification.id } })).isRead;
      }).toBe(true);
      const updatedSwap = await prisma.swapRequest.findUniqueOrThrow({ where: { id: swap.id } });
      expect(updatedSwap.updatedAt.getTime()).toBeGreaterThan(oldActivity.getTime());
    } finally {
      await context.close();
    }
  });

  test("keeps an archived item conversation readable but closed for new messages", async ({ browser }) => {
    const maria = await prisma.user.findUniqueOrThrow({ where: { email: MARIA.email } });
    const dmitry = await prisma.user.findUniqueOrThrow({ where: { email: "dmitry@menarium.ru" } });
    const item = await prisma.item.findFirstOrThrow({ where: { ownerId: dmitry.id } });
    const thread = await prisma.itemThread.create({
      data: { itemId: item.id, buyerId: maria.id, ownerId: dmitry.id },
    });
    const message = await prisma.itemThreadMessage.create({
      data: {
        threadId: thread.id,
        senderId: dmitry.id,
        text: "[E2E archived chat] История остаётся доступной",
      },
    });
    await prisma.item.update({ where: { id: item.id }, data: { status: ItemStatus.ARCHIVED } });

    const context = await browser.newContext();
    try {
      await login(context);
      const page = await context.newPage();
      await page.goto(`/item/${item.id}?thread=${thread.id}`);
      const main = page.locator("main");
      const messageLog = main.getByRole("log", { name: "Сообщения чата" });
      await expect(messageLog.getByText(message.text, { exact: true })).toHaveCount(1);
      await expect(messageLog.getByText(message.text, { exact: true })).toBeVisible();
      const composer = main.getByRole("textbox", { name: "Текст сообщения" });
      await expect(composer).toHaveAttribute(
        "placeholder",
        "Переписка закрыта для новых сообщений",
      );
      await expect(composer).toBeDisabled();

      const post = await context.request.post(`/api/items/chat/${thread.id}/messages`, {
        data: { text: "Это сообщение не должно отправиться" },
      });
      expect(post.status(), await post.text()).toBe(409);
    } finally {
      await context.close();
    }
  });

  test("accepts a rapid photo batch, rejects MIME spoofing and foreign asset binding", async ({ browser }) => {
    const context = await browser.newContext();
    const uploadedIds: string[] = [];
    try {
      await login(context);
      const sony = readFileSync(path.join(process.cwd(), "public", "demo", "items", "sony.png"));
      const canon = readFileSync(path.join(process.cwd(), "public", "demo", "items", "canon.png"));
      const upload = (name: string, buffer: Buffer, mimeType = "image/png") =>
        context.request.post("/api/media", {
          multipart: {
            ownerType: "ITEM",
            file: { name, mimeType, buffer },
          },
        });

      const maria = await prisma.user.findUniqueOrThrow({ where: { email: MARIA.email } });
      const ownItem = await prisma.item.findFirstOrThrow({ where: { ownerId: maria.id } });
      const directBinding = await context.request.post("/api/media", {
        multipart: {
          ownerType: "ITEM",
          itemId: ownItem.id,
          file: { name: "direct.png", mimeType: "image/png", buffer: sony },
        },
      });
      expect(directBinding.status(), await directBinding.text()).toBe(400);

      const [first, second] = await Promise.all([
        upload("sony.png", sony),
        upload("canon.png", canon),
      ]);
      expect(first.status(), await first.text()).toBe(201);
      expect(second.status(), await second.text()).toBe(201);
      const firstAsset = (await first.json()).data as { id: string };
      const secondAsset = (await second.json()).data as { id: string };
      uploadedIds.push(firstAsset.id, secondAsset.id);

      const stored = await prisma.mediaAsset.findMany({
        where: { id: { in: uploadedIds } },
        select: { width: true, height: true, itemId: true },
      });
      expect(stored).toHaveLength(2);
      expect(stored.every((asset) => asset.width && asset.height && asset.itemId === null)).toBe(true);

      const spoofed = await upload("spoofed.jpg", sony, "image/jpeg");
      expect(spoofed.status(), await spoofed.text()).toBe(400);

      const dmitry = await prisma.user.findUniqueOrThrow({ where: { email: "dmitry@menarium.ru" } });
      const foreignAsset = await prisma.mediaAsset.findFirstOrThrow({
        where: { ownerId: dmitry.id, itemId: { not: null } },
      });
      const title = "[E2E] Попытка привязать чужое фото";
      const create = await context.request.post("/api/items", {
        data: {
          title,
          type: "THING",
          category: "Техника",
          description: "Валидное описание объявления для проверки атомарной привязки изображений.",
          city: "Москва",
          isOnline: false,
          desired: [],
          acceptsAnything: true,
          extraOfferText: "",
          images: [{ id: firstAsset.id }, { id: foreignAsset.id }],
        },
      });
      expect(create.status(), await create.text()).toBe(400);
      expect(await prisma.item.findFirst({ where: { title } })).toBeNull();
      expect(
        (await prisma.mediaAsset.findUniqueOrThrow({ where: { id: firstAsset.id } })).itemId,
      ).toBeNull();

      const profile = await context.request.patch("/api/users/me", {
        data: { name: "Мария К.", city: "Москва", image: "https://evil.example/avatar.jpg" },
      });
      expect(profile.status(), await profile.text()).toBe(400);
    } finally {
      for (const id of uploadedIds) {
        await context.request.delete(`/api/media?id=${encodeURIComponent(id)}`).catch(() => undefined);
      }
      await context.close();
    }
  });
});
