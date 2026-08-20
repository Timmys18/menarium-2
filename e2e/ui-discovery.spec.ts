import { devices, expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";

const MARIA = {
  email: "maria@menarium.ru",
  password: "MenariumDemo2026!",
};
const iphone13 = {
  userAgent: devices["iPhone 13"].userAgent,
  viewport: devices["iPhone 13"].viewport,
  deviceScaleFactor: devices["iPhone 13"].deviceScaleFactor,
  isMobile: devices["iPhone 13"].isMobile,
  hasTouch: devices["iPhone 13"].hasTouch,
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

async function login(page: import("@playwright/test").Page) {
  await page.goto("/auth/login");
  const content = page.locator("main");
  await content.getByLabel("Электронная почта").fill(MARIA.email);
  await content.getByLabel("Пароль").fill(MARIA.password);
  await content.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), {
    waitUntil: "commit",
    timeout: 30_000,
  });
}

test.describe("Мобильное открытие каталога", () => {
  test.use(iphone13);
  test.beforeEach(() => resetSeedData());

  test("личный кабинет помещается на экран и показывает ключевые разделы", async ({ page }) => {
    await login(page);
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await page.locator("#main-content").first().waitFor({ state: "visible" });

    const navigation = page.getByRole("navigation", { name: "Мобильная навигация" });
    await expect(navigation).toBeVisible();

    for (const label of ["Каталог", "Свайп", "Создать", "Обмены", "Чаты"]) {
      await expect(navigation.getByRole("link", { name: label, exact: true })).toBeVisible();
    }

    const itemHeights = await navigation.getByRole("link").evaluateAll((links) =>
      links.map((link) => Math.round(link.getBoundingClientRect().height)),
    );
    expect(new Set(itemHeights).size).toBe(1);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("фильтр города меняет выдачу и сохраняется при сортировке", async ({ page }) => {
    await page.goto("/catalog", { waitUntil: "domcontentloaded" });
    await page.locator("#main-content").first().waitFor({ state: "visible" });

    await expect(page.getByRole("button", { name: "Найти" })).toBeVisible();
    await page.locator("summary").filter({ visible: true }).click();
    await page.getByRole("button", { name: "Выберите город", exact: true }).click();
    await page.getByRole("combobox", { name: "Найти город в списке" }).fill("Москва");
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

/*
  Ширина оболочки проверяется на широком экране намеренно: визуальные эталоны
  снимаются на 1440, а расхождение начинается только за 1480 — там, где шапка
  упирается в свой предел, а страница ещё нет. Именно так каталог и избранное
  вылезали за шапку на 60 и 10 пикселей, и ни один снимок этого не показывал.
*/
test.describe("Общая ширина на широком экране", () => {
  test.use({ viewport: { width: 1728, height: 950 } });
  test.beforeEach(() => resetSeedData());

  test("контент не выходит за пределы шапки", async ({ page }) => {
    await login(page);

    for (const route of ["/catalog", "/favorites", "/exchange", "/profile"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.locator("#main-content").first().waitFor({ state: "visible" });

      const box = await page.evaluate(() => {
        const header = document.querySelector("nav[aria-label='Основная навигация'] .mx-auto");
        const container = document.querySelector("#main-content .mx-auto");
        if (!header || !container) return null;
        const h = header.getBoundingClientRect();
        const c = container.getBoundingClientRect();
        return { headerLeft: h.left, headerRight: h.right, left: c.left, right: c.right };
      });

      expect(box, `${route}: не нашлись контейнеры шапки и страницы`).not.toBeNull();
      expect(Math.round(box!.left), `${route}: левый край контента левее шапки`).toBeGreaterThanOrEqual(
        Math.round(box!.headerLeft),
      );
      expect(Math.round(box!.right), `${route}: правый край контента правее шапки`).toBeLessThanOrEqual(
        Math.round(box!.headerRight),
      );
    }
  });
});
