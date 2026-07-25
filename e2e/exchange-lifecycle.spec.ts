import { expect, test, type Locator, type Page } from "@playwright/test";
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
const mariaReview = "Всё прошло точно по договорённости, камера в отличном состоянии.";
const dmitryReview = "Мария приехала вовремя, вещь полностью соответствует описанию.";

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

function pick(locator: Locator) {
  return locator.filter({ visible: true }).first();
}

async function openNotification(page: Page, title: string) {
  await page.goto("/notifications");
  const content = main(page);
  await expect(content.getByRole("heading", { name: title }).first()).toBeVisible({ timeout: 20_000 });
  await pick(content.getByRole("heading", { name: title })).click();
  await page.waitForURL(/\/exchange\?.*swap=/, { timeout: 20_000 });
}

async function sendDealMessage(page: Page, message: string) {
  const content = main(page);
  const input = pick(content.getByPlaceholder("Сообщение..."));
  await expect(input).toBeEnabled({ timeout: 20_000 });
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/messages") && response.request().method() === "POST",
    { timeout: 20_000 },
  );
  await input.fill(message);
  await input.press("Enter");
  const response = await responsePromise;
  if (!response.ok()) {
    throw new Error(`Message request failed (${response.status()}): ${await response.text()}`);
  }
  await page.reload();
  await expect(pick(main(page).getByText(message))).toBeVisible({ timeout: 20_000 });
}

async function login(page: Page, credentials: typeof MARIA) {
  await page.goto("/auth/login");
  const content = main(page);
  await pick(content.getByLabel("Электронная почта")).fill(credentials.email);
  await pick(content.getByLabel("Пароль")).fill(credentials.password);
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
  test.beforeEach(({}, testInfo) => {
    testInfo.setTimeout(150_000);
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
        await pick(mariaMain.getByRole("textbox", { name: "Название" })).fill(createdItemTitle);
        await pick(mariaMain.getByRole("button", { name: "Продолжить" })).click();
        await pick(mariaMain.getByRole("textbox", { name: "Описание" })).fill(
          "Новая клавиатура с тихими переключателями и полным комплектом.",
        );
        await pick(mariaMain.getByRole("button", { name: "Продолжить" })).click();
        await pick(mariaMain.getByRole("textbox", { name: "Что интересно получить" })).fill("Пленочная камера");
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
        await expect(maria).toHaveURL(/\/exchange\?.*tab=outgoing.*swap=[^&]+/);
        await expect(mariaMain.getByText("Предложение отправлено", { exact: true })).toBeVisible();
        await expect(mariaMain.getByText("Ждём ответа", { exact: true }).first()).toBeVisible();
      });

      await test.step("Дмитрий получает предложение и принимает его", async () => {
        await openNotification(dmitry, "Новое предложение обмена");
        await expect(pick(main(dmitry).getByText("Вы отдаёте", { exact: true }))).toBeVisible();
        await expect(pick(main(dmitry).getByText("Вы получаете", { exact: true }))).toBeVisible();
        await confirmAction(dmitry, "Принять", "Принять обмен");
        await expect(dmitry).toHaveURL(/\/exchange\?.*tab=matches.*notice=accepted/);
        await expect(main(dmitry).getByText("Обмен принят", { exact: true })).toBeVisible();
        await expect(pick(main(dmitry).getByPlaceholder("Сообщение..."))).toBeEnabled({ timeout: 20_000 });
      });

      await test.step("обе стороны обмениваются сообщениями в чате сделки", async () => {
        await openNotification(maria, "Обмен принят");
        await sendDealMessage(maria, senderMessage);

        await openNotification(dmitry, "Новое сообщение в обмене");
        await expect(pick(main(dmitry).getByText(senderMessage))).toBeVisible({ timeout: 20_000 });
        await sendDealMessage(dmitry, receiverMessage);

        await maria.reload();
        await expect(pick(main(maria).getByText(receiverMessage))).toBeVisible({ timeout: 20_000 });
      });

      await test.step("обе стороны подтверждают завершение", async () => {
        await confirmAction(maria, "Подтвердить завершение", "Подтвердить завершение");
        await expect(pick(main(maria).getByText(/Ожидаем подтверждения от партнёра/))).toBeVisible({
          timeout: 20_000,
        });

        await openNotification(dmitry, "Партнёр подтвердил завершение");
        await confirmAction(dmitry, "Подтвердить завершение", "Подтвердить завершение");
        await expect(pick(main(dmitry).getByPlaceholder("Обмен завершён, чат доступен только для чтения"))).toBeDisabled({
          timeout: 20_000,
        });
      });

      await test.step("финальное уведомление и история доступны отправителю", async () => {
        await openNotification(maria, "Обмен завершен");

        await maria.goto("/exchange?tab=outgoing&filter=history");
        const mariaMain = main(maria);
        await expect(mariaMain.getByText(targetItemTitle, { exact: true }).first()).toBeVisible();
        await expect(mariaMain.getByText("Обмен завершён", { exact: true }).first()).toBeVisible();
        await expect(mariaMain.getByText(senderMessage).first()).toBeVisible();
        await expect(mariaMain.getByText(receiverMessage).first()).toBeVisible();
      });

      await test.step("встречные отзывы публикуются в подтверждённой репутации", async () => {
        const mariaMain = main(maria);
        await pick(mariaMain.getByRole("button", { name: "5 из 5 — Отлично" })).click();
        await pick(mariaMain.getByPlaceholder("Что было особенно хорошо или что стоит улучшить?"))
          .fill(mariaReview);
        const mariaReviewResponse = maria.waitForResponse(
          (response) =>
            response.url().includes("/review") && response.request().method() === "POST",
          { timeout: 20_000 },
        );
        await pick(mariaMain.getByRole("button", { name: "Проверить и отправить" })).click();
        const mariaReviewDialog = maria.getByRole("dialog", { name: "Проверить отзыв" });
        await expect(mariaReviewDialog).toBeVisible();
        await mariaReviewDialog.getByRole("button", { name: "Отправить отзыв" }).click();
        expect((await mariaReviewResponse).ok()).toBeTruthy();
        await expect(pick(mariaMain.getByText(/Отзыв откроется после ответа партнёра/))).toBeVisible();

        const dmitryMain = main(dmitry);
        await pick(dmitryMain.getByRole("button", { name: "5 из 5 — Отлично" })).click();
        await pick(dmitryMain.getByPlaceholder("Что было особенно хорошо или что стоит улучшить?"))
          .fill(dmitryReview);
        const dmitryReviewResponse = dmitry.waitForResponse(
          (response) =>
            response.url().includes("/review") && response.request().method() === "POST",
          { timeout: 20_000 },
        );
        await pick(dmitryMain.getByRole("button", { name: "Проверить и отправить" })).click();
        const dmitryReviewDialog = dmitry.getByRole("dialog", { name: "Проверить отзыв" });
        await expect(dmitryReviewDialog).toBeVisible();
        await dmitryReviewDialog.getByRole("button", { name: "Отправить отзыв" }).click();
        expect((await dmitryReviewResponse).ok()).toBeTruthy();
        await expect(pick(dmitryMain.getByText("Отзыв опубликован в профиле партнёра."))).toBeVisible();

        await maria.goto("/profile");
        await pick(main(maria).getByRole("link", { name: "Публичный профиль" })).click();
        await expect(pick(main(maria).getByText(dmitryReview, { exact: true }))).toBeVisible({
          timeout: 20_000,
        });
      });
    } finally {
      await mariaContext.close();
      await dmitryContext.close();
    }
  });
});
