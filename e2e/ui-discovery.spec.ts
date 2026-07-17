import { expect, test } from "@playwright/test";

test.describe("Мобильное открытие каталога", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("главная помещается на экран и показывает ключевые разделы", async ({ page }) => {
    await page.goto("/");

    const navigation = page.getByRole("navigation", { name: "Мобильная навигация" });
    await expect(navigation).toBeVisible();

    for (const label of ["Каталог", "Свайп", "Создать", "Обмены", "Профиль"]) {
      await expect(navigation.getByRole("link", { name: label, exact: true })).toBeVisible();
    }

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("фильтр города меняет выдачу и сохраняется при сортировке", async ({ page }) => {
    await page.goto("/catalog");

    await expect(page.getByRole("button", { name: "Найти" })).toBeVisible();
    await page.locator("summary").click();
    await page.getByRole("link", { name: "Москва", exact: true }).click();

    await expect(page).toHaveURL(/city=/);
    await expect(page.getByText("Найдено: 2", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Тренды", exact: true })).toHaveAttribute(
      "href",
      /city=.*&sort=trends/,
    );
  });
});
