import { expect, test } from "@playwright/test";

test.describe("Menarium smoke", () => {
  test("главная страница загружается", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("MENARIUM").first()).toBeVisible();
  });

  test("каталог открывается", async ({ page }) => {
    await page.goto("/catalog");
    await expect(page.getByRole("heading", { name: "Найди встречный вариант" })).toBeVisible();
  });

  test("страница входа открывается", async ({ page }) => {
    await page.goto("/auth/login");
    const form = page.locator("main");
    await expect(form.getByLabel("Электронная почта").filter({ visible: true }).first()).toBeVisible();
    await expect(form.getByRole("button", { name: "Войти" }).filter({ visible: true }).first()).toBeVisible();
  });

  test("страница регистрации открывается", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(page.getByRole("button", { name: "Зарегистрироваться" })).toBeVisible();
  });

  test("сброс пароля открывается", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await expect(page.getByRole("button", { name: "Отправить ссылку" })).toBeVisible();
  });

  test("robots.txt доступен", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.ok()).toBeTruthy();
  });

  test("sitemap доступен", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.ok()).toBeTruthy();
  });
});
