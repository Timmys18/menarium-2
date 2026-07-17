import { expect, test, type Locator, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";

const MARIA = {
  email: "maria@menarium.ru",
  password: "MenariumDemo2026!",
};
const itemTitle = "[E2E] Объявление с паузой";

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

async function login(page: Page) {
  await page.goto("/auth/login");
  const content = main(page);
  await pick(content.getByLabel("Электронная почта")).fill(MARIA.email);
  await pick(content.getByLabel("Пароль")).fill(MARIA.password);
  await pick(content.getByRole("button", { name: "Войти" })).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 15_000 });
}

function itemCard(page: Page) {
  const heading = page.getByRole("heading", { name: itemTitle, exact: true });
  return main(page).getByRole("article").filter({ has: heading }).first();
}

test.describe("жизненный цикл объявления", () => {
  test.beforeEach(() => resetSeedData());

  test("владелец ставит объявление на паузу и возвращает его в каталог", async ({ page }) => {
    await login(page);

    await page.goto("/new");
    const content = main(page);
    await pick(content.getByRole("textbox", { name: "Название" })).fill(itemTitle);
    await pick(content.getByRole("button", { name: "Продолжить" })).click();
    await pick(content.getByRole("textbox", { name: "Описание" })).fill(
      "Проверочное объявление для безопасной паузы и повторной публикации.",
    );
    await pick(content.getByRole("button", { name: "Продолжить" })).click();
    await pick(content.getByRole("textbox", { name: "Что интересно получить" })).fill(
      "Фотоаппарат",
    );
    await pick(content.getByRole("button", { name: "Создать объявление" })).click();
    await expect(page).toHaveURL(/\/item\/[^/?]+$/);

    await page.goto("/my-items?status=active");
    await expect(itemCard(page)).toBeVisible();
    await itemCard(page).getByRole("button", { name: "На паузу" }).click();
    const dialog = page.getByRole("dialog", { name: "Приостановить объявление?" });
    await dialog.getByRole("button", { name: "Приостановить", exact: true }).click();
    await expect(page).toHaveURL(/\/my-items\?status=paused&notice=paused/);
    await expect(itemCard(page).getByText("На паузе", { exact: true })).toBeVisible();

    await page.goto(`/catalog?q=${encodeURIComponent(itemTitle)}`);
    await expect(main(page).getByText(itemTitle, { exact: true })).toHaveCount(0);

    await page.goto("/my-items?status=paused");
    await itemCard(page).getByRole("button", { name: "Вернуть в каталог" }).click();
    await expect(page).toHaveURL(/\/my-items\?status=active&notice=resumed/);
    await expect(itemCard(page).getByText("Опубликовано", { exact: true })).toBeVisible();

    await page.goto(`/catalog?q=${encodeURIComponent(itemTitle)}`);
    await expect(pick(main(page).getByText(itemTitle, { exact: true }))).toBeVisible();
  });
});
