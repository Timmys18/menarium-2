import { expect, test, type Locator, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";

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

function pick(locator: Locator) {
  return locator.filter({ visible: true }).first();
}

async function login(page: Page) {
  await page.goto("/auth/login");
  const content = page.locator("main");
  await pick(content.getByLabel("Электронная почта")).fill(MARIA.email);
  await pick(content.getByLabel("Пароль")).fill(MARIA.password);
  await pick(content.getByRole("button", { name: "Войти" })).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 15_000 });
}

test.describe("настройки и доверие", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(({}, testInfo) => {
    testInfo.setTimeout(90_000);
    resetSeedData();
  });

  test("настройки ведут в публичный профиль и заранее проверяют пароль", async ({ page }) => {
    await login(page);
    await page.goto("/profile/edit");

    const content = page.locator("main");
    await expect(content.getByRole("heading", { name: "Настройки профиля" })).toBeVisible();
    await expect(content.getByRole("link", { name: "Безопасность" })).toBeVisible();

    const currentPassword = content.getByRole("textbox", { name: "Текущий пароль", exact: true });
    const newPassword = content.getByRole("textbox", { name: "Новый пароль", exact: true });
    const submit = content.getByRole("button", { name: "Обновить пароль" });

    await currentPassword.fill(MARIA.password);
    await newPassword.fill("weak");
    await expect(submit).toBeDisabled();
    await newPassword.fill("Secure2026!");
    await expect(submit).toBeEnabled();

    await content.getByRole("button", { name: "Показать новый пароль" }).click();
    await expect(newPassword).toHaveAttribute("type", "text");

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);

    await content.getByRole("link", { name: "Публичный профиль" }).click();
    await expect(content.getByRole("heading", { name: "Мария К." })).toBeVisible();
    await expect(content.getByRole("link", { name: "Редактировать" })).toBeVisible();
  });

  test("безопасность и уведомления доступны из аккаунта", async ({ page }) => {
    await login(page);
    await page.goto("/profile/safety");
    await expect(page.locator("main").getByRole("heading", { name: "Центр безопасности" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Фильтр обращений" })).toBeVisible();

    await page.goto("/notifications");
    const content = page.locator("main");
    await expect(content.getByRole("heading", { name: "Уведомления" })).toBeVisible();
    await expect(content.getByRole("navigation", { name: "Фильтр уведомлений" })).toBeVisible();
  });
});
