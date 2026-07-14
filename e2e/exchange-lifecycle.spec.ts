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

function main(page: Page) {
  return page.locator("main");
}

async function login(page: Page, credentials: typeof MARIA) {
  await page.goto("/auth/login");
  const content = main(page);
  await content.getByPlaceholder("Электронная почта").fill(credentials.email);
  await content.getByPlaceholder("Пароль").fill(credentials.password);
  await content.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 15_000 });
  await expect(page).toHaveURL(/\/(profile)?$/);
}

async function confirmAction(page: Page, actionLabel: string, confirmLabel: string) {
  await main(page).getByRole("button", { name: actionLabel, exact: true }).click();
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
        await login(maria, MARIA);
        await login(dmitry, DMITRY);
      });

      await test.step("Мария создает объявление через UI", async () => {
        await maria.goto("/new");
        const mariaMain = main(maria);
        await mariaMain.getByPlaceholder("Например, Sony WH-1000XM5").fill(createdItemTitle);
        await mariaMain
          .getByPlaceholder("Состояние, комплектация, нюансы, что важно знать перед обменом...")
          .fill("Новая клавиатура с тихими переключателями и полным комплектом.");
        await mariaMain.getByPlaceholder("Через запятую: iPad Pro, камера, часы").fill("Пленочная камера");
        await mariaMain.getByRole("button", { name: "Создать объявление" }).click();
        await expect(maria).toHaveURL(/\/item\/[^/?]+$/);
        await expect(mariaMain.getByRole("heading", { name: createdItemTitle })).toBeVisible();
      });

      await test.step("Мария выбирает seeded объявление и предлагает обмен", async () => {
        await maria.goto(`/catalog?q=${encodeURIComponent(targetItemTitle)}&sort=new`);
        await main(maria).getByRole("link").filter({ hasText: targetItemTitle }).click();
        const mariaMain = main(maria);
        await expect(mariaMain.getByRole("heading", { name: targetItemTitle })).toBeVisible();
        await mariaMain.locator("select").selectOption({ label: createdItemTitle });
        await mariaMain.getByRole("button", { name: "Предложить обмен" }).click();
        await expect(maria).toHaveURL(/\/exchange\?swap=[^&]+/);
        await expect(mariaMain.getByText("Ожидает", { exact: true })).toBeVisible();
      });

      await test.step("Дмитрий получает предложение и принимает его", async () => {
        await dmitry.goto("/notifications");
        const dmitryMain = main(dmitry);
        await expect(dmitryMain.getByRole("heading", { name: "Новое предложение обмена" })).toBeVisible();
        await dmitryMain.getByRole("heading", { name: "Новое предложение обмена" }).click();
        await expect(dmitry).toHaveURL(/\/exchange\?.*swap=/);
        await confirmAction(dmitry, "Принять", "Принять обмен");
        await expect(dmitryMain.getByText("Принят", { exact: true }).last()).toBeVisible();
        await expect(dmitryMain.getByPlaceholder("Сообщение...")).toBeEnabled();
      });

      await test.step("обе стороны обмениваются сообщениями в чате сделки", async () => {
        await maria.goto("/notifications");
        const mariaMain = main(maria);
        await expect(mariaMain.getByRole("heading", { name: "Обмен принят" })).toBeVisible();
        await mariaMain.getByRole("heading", { name: "Обмен принят" }).click();
        await mariaMain.getByPlaceholder("Сообщение...").fill(senderMessage);
        await mariaMain.getByPlaceholder("Сообщение...").press("Enter");
        await expect(mariaMain.getByText(senderMessage)).toBeVisible();

        await dmitry.goto("/notifications");
        const dmitryMain = main(dmitry);
        await expect(dmitryMain.getByRole("heading", { name: "Новое сообщение в обмене" })).toBeVisible();
        await dmitryMain.getByRole("heading", { name: "Новое сообщение в обмене" }).click();
        await expect(dmitryMain.getByText(senderMessage)).toBeVisible();
        await dmitryMain.getByPlaceholder("Сообщение...").fill(receiverMessage);
        await dmitryMain.getByPlaceholder("Сообщение...").press("Enter");
        await expect(dmitryMain.getByText(receiverMessage)).toBeVisible();

        await maria.reload();
        await expect(main(maria).getByText(receiverMessage)).toBeVisible();
      });

      await test.step("обе стороны подтверждают завершение", async () => {
        await confirmAction(maria, "Подтвердить завершение", "Подтвердить завершение");
        await expect(main(maria).getByText(/Ожидаем подтверждения от партнёра/)).toBeVisible();

        await dmitry.goto("/notifications");
        const dmitryMain = main(dmitry);
        await expect(dmitryMain.getByRole("heading", { name: "Партнёр подтвердил завершение" })).toBeVisible();
        await dmitryMain.getByRole("heading", { name: "Партнёр подтвердил завершение" }).click();
        await confirmAction(dmitry, "Подтвердить завершение", "Подтвердить завершение");
        await expect(dmitryMain.getByText("Завершен", { exact: true }).last()).toBeVisible();
        await expect(dmitryMain.getByPlaceholder("Чат закрыт для новых сообщений")).toBeDisabled();
      });

      await test.step("финальное уведомление и история доступны отправителю", async () => {
        await maria.goto("/notifications");
        await expect(main(maria).getByRole("heading", { name: "Обмен завершен" })).toBeVisible();

        await maria.goto("/exchange?tab=outgoing&filter=history");
        const mariaMain = main(maria);
        await expect(mariaMain.getByText(targetItemTitle, { exact: true }).first()).toBeVisible();
        await expect(mariaMain.getByText("Завершен", { exact: true }).first()).toBeVisible();
        await expect(mariaMain.getByText(senderMessage)).toBeVisible();
        await expect(mariaMain.getByText(receiverMessage)).toBeVisible();
      });
    } finally {
      await mariaContext.close();
      await dmitryContext.close();
    }
  });
});
