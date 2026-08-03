import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";

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

test.describe("Мобильное открытие каталога", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.beforeEach(() => resetSeedData());

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
    await page.locator("summary").filter({ visible: true }).click();
    await page.getByRole("button", { name: "Выберите город", exact: true }).click();
    await page.getByRole("textbox", { name: "Найти город в списке" }).fill("Москва");
    await page.getByRole("option", { name: "Москва Москва", exact: true }).click();

    await expect(page).toHaveURL(/city=/);
    await expect(
      page.getByRole("main").getByText("Найдено: 2", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Актуальные", exact: true })).toHaveAttribute(
      "href",
      /city=.*&sort=trends/,
    );
  });
});
