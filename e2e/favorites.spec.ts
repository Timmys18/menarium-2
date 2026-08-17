import { expect, test, type Locator, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";

const MARIA = {
  email: "maria@menarium.ru",
  password: "MenariumDemo2026!",
};
const targetItemTitle = "Canon AE-1";

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
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), {
    waitUntil: "commit",
    timeout: 30_000,
  });
}

test.describe("избранное", () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.setTimeout(90_000);
    resetSeedData();
  });

  test("сохранённая вещь появляется в личной подборке и удаляется", async ({ page }) => {
    await login(page);
    await page.goto(`/catalog?q=${encodeURIComponent(targetItemTitle)}&sort=new`);

    const saveButton = pick(
      main(page).getByRole("button", { name: `Сохранить «${targetItemTitle}» в избранное` }),
    );
    const saveResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/favorite") && response.request().method() === "PUT",
      { timeout: 20_000 },
    );
    await saveButton.click();
    expect((await saveResponse).ok()).toBeTruthy();
    await expect(
      pick(main(page).getByRole("button", { name: `Убрать «${targetItemTitle}» из избранного` })),
    ).toHaveAttribute("aria-pressed", "true");

    await page.goto("/favorites");
    await expect(main(page).getByRole("heading", { name: "Сохранённые варианты" })).toBeVisible();
    await expect(main(page).getByRole("heading", { name: targetItemTitle })).toBeVisible();

    const removeButton = pick(
      main(page).getByRole("button", { name: `Убрать «${targetItemTitle}» из избранного` }),
    );
    const removeResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/favorite") && response.request().method() === "DELETE",
      { timeout: 20_000 },
    );
    await removeButton.click();
    expect((await removeResponse).ok()).toBeTruthy();
    await expect(main(page).getByRole("heading", { name: "Здесь появятся ваши находки" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(main(page).getByText(/Сохранено:\s*0/)).toBeVisible();
  });
});
