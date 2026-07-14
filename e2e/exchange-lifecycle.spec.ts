import { expect, test, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";

const MARIA = {
  email: "maria@menarium.ru",
  password: "MenariumDemo2026!",
};
const DMITRY = {
  email: "dmitry@menarium.ru",
  password: "MenariumDemo2026!",
};

const createdItemTitle = "[E2E] Механическая клавиатура";
const targetItemTitle = "Canon AE-1";
const senderMessage = "Здравствуйте! Готова встретиться в субботу в 12:00.";
const receiverMessage = "Подходит, договорились у метро.";

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

async function login(page: Page, credentials: typeof MARIA) {
  await page.goto("/auth/login");
  await page.getByPlaceholder("Электронная почта").fill(credentials.email);
  await page.getByPlaceholder("Пароль").fill(credentials.password);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL("/");
}

async function confirmAction(page: Page, actionLabel: string, confirmLabel: string) {
  await page.getByRole("button", { name: actionLabel, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Подтвердите действие" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: confirmLabel, exact: true }).click();
  await expect(dialog).toBeHidden();
}

test.describe("критический жизненный цикл обмена", () => {
  test.beforeEach(() => {
    resetSeedData();
  });

  test("от создания объявления до уведомления и истории завершенной сделки", async ({ browser }) => {
    const mariaContext = await browser.newContext();
    const dmitryContext = await browser.newContext();
    const maria = await mariaContext.newPage();
    const dmitry = await dmitryContext.newPage();

    try {
      await test.step("seeded пользователи входят в независимых сессиях", async () => {
        await Promise.all([login(maria, MARIA), login(dmitry, DMITRY)]);
      });

      await test.step("Мария создает объявление через UI", async () => {
        await maria.goto("/new");
        await maria.getByPlaceholder("Например, Sony WH-1000XM5").fill(createdItemTitle);
        await maria
          .getByPlaceholder("Состояние, комплектация, нюансы, что важно знать перед обменом...")
          .fill("Новая клавиатура с тихими переключателями и полным комплектом.");
        await maria.getByPlaceholder("Через запятую: iPad Pro, камера, часы").fill("Пленочная камера");
        await maria.getByRole("button", { name: "Создать объявление" }).click();
        await expect(maria).toHaveURL(/\/item\/[^/?]+$/);
        await expect(maria.getByRole("heading", { name: createdItemTitle })).toBeVisible();
      });

      await test.step("Мария выбирает seeded объявление и предлагает обмен", async () => {
        await maria.goto(`/catalog?q=${encodeURIComponent(targetItemTitle)}&sort=new`);
        await maria.getByRole("link").filter({ hasText: targetItemTitle }).click();
        await expect(maria.getByRole("heading", { name: targetItemTitle })).toBeVisible();
        await maria.locator("select").selectOption({ label: createdItemTitle });
        await maria.getByRole("button", { name: "Предложить обмен" }).click();
        await expect(maria).toHaveURL(/\/exchange\?swap=[^&]+/);
        await expect(maria.getByText("Ожидает", { exact: true })).toBeVisible();
      });

      await test.step("Дмитрий получает предложение и принимает его", async () => {
        await dmitry.goto("/notifications");
        await expect(dmitry.getByRole("heading", { name: "Новое предложение обмена" })).toBeVisible();
        await dmitry.getByRole("heading", { name: "Новое предложение обмена" }).click();
        await expect(dmitry).toHaveURL(/\/exchange\?.*swap=/);
        await confirmAction(dmitry, "Принять", "Принять обмен");
        await expect(dmitry.getByText("Принят", { exact: true }).last()).toBeVisible();
        await expect(dmitry.getByPlaceholder("Сообщение...")).toBeEnabled();
      });

      await test.step("обе стороны обмениваются сообщениями в чате сделки", async () => {
        await maria.goto("/notifications");
        await expect(maria.getByRole("heading", { name: "Обмен принят" })).toBeVisible();
        await maria.getByRole("heading", { name: "Обмен принят" }).click();
        await maria.getByPlaceholder("Сообщение...").fill(senderMessage);
        await maria.getByPlaceholder("Сообщение...").press("Enter");
        await expect(maria.getByText(senderMessage)).toBeVisible();

        await dmitry.goto("/notifications");
        await expect(dmitry.getByRole("heading", { name: "Новое сообщение в обмене" })).toBeVisible();
        await dmitry.getByRole("heading", { name: "Новое сообщение в обмене" }).click();
        await expect(dmitry.getByText(senderMessage)).toBeVisible();
        await dmitry.getByPlaceholder("Сообщение...").fill(receiverMessage);
        await dmitry.getByPlaceholder("Сообщение...").press("Enter");
        await expect(dmitry.getByText(receiverMessage)).toBeVisible();

        await maria.reload();
        await expect(maria.getByText(receiverMessage)).toBeVisible();
      });

      await test.step("обе стороны подтверждают завершение", async () => {
        await confirmAction(maria, "Подтвердить завершение", "Подтвердить завершение");
        await expect(maria.getByText(/Ожидаем подтверждения от партнёра/)).toBeVisible();

        await dmitry.goto("/notifications");
        await expect(dmitry.getByRole("heading", { name: "Партнёр подтвердил завершение" })).toBeVisible();
        await dmitry.getByRole("heading", { name: "Партнёр подтвердил завершение" }).click();
        await confirmAction(dmitry, "Подтвердить завершение", "Подтвердить завершение");
        await expect(dmitry.getByText("Завершен", { exact: true }).last()).toBeVisible();
        await expect(dmitry.getByPlaceholder("Чат закрыт для новых сообщений")).toBeDisabled();
      });

      await test.step("финальное уведомление и история доступны отправителю", async () => {
        await maria.goto("/notifications");
        await expect(maria.getByRole("heading", { name: "Обмен завершен" })).toBeVisible();

        await maria.goto("/exchange?tab=outgoing&filter=history");
        await expect(maria.getByText(targetItemTitle, { exact: true }).first()).toBeVisible();
        await expect(maria.getByText("Завершен", { exact: true }).first()).toBeVisible();
        await expect(maria.getByText(senderMessage)).toBeVisible();
        await expect(maria.getByText(receiverMessage)).toBeVisible();
      });
    } finally {
      await mariaContext.close();
      await dmitryContext.close();
    }
  });
});
