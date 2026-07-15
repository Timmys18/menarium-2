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

function pick<T extends { first: () => T }>(locator: T) {
  return locator.first();
}

async function login(page: Page, credentials: typeof MARIA) {
  await page.goto("/auth/login");
  const content = main(page);
  await pick(content.getByPlaceholder("Электронная почта")).fill(credentials.email);
  await pick(content.getByPlaceholder("Пароль")).fill(credentials.password);
  await pick(content.getByRole("button", { name: "Войти" })).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 15_000 });
  await expect(page).toHaveURL(/\/(profile)?$/);
}

async function confirmAction(page: Page, actionLabel: string, confirmLabel: string) {
  await pick(main(page).getByRole("button", { name: actionLabel, exact: true })).click();
  const dialog = page.getByRole("dialog", { name: "Подтвердите действие" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: confirmLabel, exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
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
        await mariaMain.getByRole("textbox", { name: "Название" }).first().fill(createdItemTitle);
        await mariaMain
          .getByRole("textbox", { name: "Описание" })
          .first()
          .fill("Новая клавиатура с тихими переключателями и полным комплектом.");
        await mariaMain.getByRole("textbox", { name: "Что хотите взамен" }).first().fill("Пленочная камера");
        await pick(mariaMain.getByRole("button", { name: "Создать объявление" })).click();
        await expect(maria).toHaveURL(/\/item\/[^/?]+$/);
        await expect(mariaMain.getByRole("heading", { name: createdItemTitle })).toBeVisible();
      });

      await test.step("Мария выбирает seeded объявление и предлагает обмен", async () => {
        await maria.goto(`/catalog?q=${encodeURIComponent(targetItemTitle)}&sort=new`);
        await pick(main(maria).getByRole("link").filter({ hasText: targetItemTitle })).click();
        const mariaMain = main(maria);
        await expect(mariaMain.getByRole("heading", { name: targetItemTitle }).first()).toBeVisible();
        await pick(mariaMain.locator("select")).selectOption({ label: createdItemTitle });
        await pick(mariaMain.getByRole("button", { name: "Предложить обмен" })).click();
        await expect(maria).toHaveURL(/\/exchange\?swap=[^&]+/);
        await expect(mariaMain.getByText("Ожидает", { exact: true }).first()).toBeVisible();
      });

      await test.step("Дмитрий получает предложение и принимает его", async () => {
        await dmitry.goto("/notifications");
        const dmitryMain = main(dmitry);
        await expect(dmitryMain.getByRole("heading", { name: "Новое предложение обмена" }).first()).toBeVisible();
        await pick(dmitryMain.getByRole("heading", { name: "Новое предложение обмена" })).click();
        await expect(dmitry).toHaveURL(/\/exchange\?.*swap=/);
        await confirmAction(dmitry, "Принять", "Принять обмен");
        await expect(pick(dmitryMain.getByPlaceholder("Сообщение..."))).toBeEnabled({ timeout: 20_000 });
      });

      await test.step("обе стороны обмениваются сообщениями в чате сделки", async () => {
        await maria.goto("/notifications");
        const mariaMain = main(maria);
        await expect(mariaMain.getByRole("heading", { name: "Обмен принят" }).first()).toBeVisible();
        await pick(mariaMain.getByRole("heading", { name: "Обмен принят" })).click();
        const mariaMessage = pick(mariaMain.getByPlaceholder("Сообщение..."));
        await mariaMessage.fill(senderMessage);
        await mariaMessage.press("Enter");
        await expect(mariaMain.getByText(senderMessage).first()).toBeVisible();

        await dmitry.goto("/notifications");
        const dmitryMain = main(dmitry);
        await expect(dmitryMain.getByRole("heading", { name: "Новое сообщение в обмене" }).first()).toBeVisible();
        await pick(dmitryMain.getByRole("heading", { name: "Новое сообщение в обмене" })).click();
        await expect(dmitryMain.getByText(senderMessage).first()).toBeVisible();
        const dmitryMessage = pick(dmitryMain.getByPlaceholder("Сообщение..."));
        await dmitryMessage.fill(receiverMessage);
        await dmitryMessage.press("Enter");
        await expect(dmitryMain.getByText(receiverMessage).first()).toBeVisible();

        await maria.reload();
        await expect(main(maria).getByText(receiverMessage).first()).toBeVisible();
      });

      await test.step("обе стороны подтверждают завершение", async () => {
        await confirmAction(maria, "Подтвердить завершение", "Подтвердить завершение");
        await expect(main(maria).getByText(/Ожидаем подтверждения от партнёра/)).toBeVisible();

        await dmitry.goto("/notifications");
        const dmitryMain = main(dmitry);
        await expect(dmitryMain.getByRole("heading", { name: "Партнёр подтвердил завершение" }).first()).toBeVisible();
        await pick(dmitryMain.getByRole("heading", { name: "Партнёр подтвердил завершение" })).click();
        await confirmAction(dmitry, "Подтвердить завершение", "Подтвердить завершение");
        await expect(pick(dmitryMain.getByPlaceholder("Чат закрыт для новых сообщений"))).toBeDisabled({
          timeout: 20_000,
        });
      });

      await test.step("финальное уведомление и история доступны отправителю", async () => {
        await maria.goto("/notifications");
        await expect(pick(main(maria).getByRole("heading", { name: "Обмен завершен" }))).toBeVisible();

        await maria.goto("/exchange?tab=outgoing&filter=history");
        const mariaMain = main(maria);
        await expect(mariaMain.getByText(targetItemTitle, { exact: true }).first()).toBeVisible();
        await expect(mariaMain.getByText("Завершен", { exact: true }).first()).toBeVisible();
        await expect(mariaMain.getByText(senderMessage).first()).toBeVisible();
        await expect(mariaMain.getByText(receiverMessage).first()).toBeVisible();
      });
    } finally {
      await mariaContext.close();
      await dmitryContext.close();
    }
  });
});
