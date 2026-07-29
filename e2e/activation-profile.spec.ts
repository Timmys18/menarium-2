import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";

const prisma = new PrismaClient();

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

test.describe("первый вход и личный кабинет", () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.setTimeout(90_000);
    resetSeedData();
  });

  test.afterAll(() => prisma.$disconnect());

  test("ведёт нового пользователя к первому обмену", async ({ page }) => {
    const email = `activation-${Date.now()}@menarium.test`;
    const password = "Activation2026!";

    try {
      await page.goto("/auth/register");
      const content = page.locator("main");
      await content.getByLabel("Электронная почта").fill(email);
      await content.getByLabel("Пароль").fill(password);
      await content.getByRole("button", { name: "Зарегистрироваться" }).click();

      await page.waitForURL((url) => url.pathname === "/profile", { timeout: 20_000 });
      await expect(content.getByText("Аккаунт создан", { exact: true })).toBeVisible();
      await expect(content.getByRole("heading", { name: "Почта не подтверждена" })).toBeVisible();
      await expect(content.getByRole("button", { name: "Отправить письмо" })).toBeVisible();

      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
      await page.goto("/profile");

      await expect(content.getByRole("heading", { name: "Расскажите о себе" })).toBeVisible();
      await expect(content.getByRole("progressbar", { name: "Прогресс до первого обмена" })).toHaveAttribute(
        "aria-valuenow",
        "20",
      );

      await content.getByRole("link", { name: "Заполнить профиль" }).click();
      await content.getByLabel("Имя").fill("Анна");
      await content.getByLabel("Город").fill("Казань");
      await content.getByRole("button", { name: "Сохранить" }).click();

      await page.waitForURL((url) => url.pathname === "/profile", { timeout: 20_000 });
      await expect(content.getByRole("heading", { name: "Добавьте вещь или услугу" })).toBeVisible();
      await expect(content.getByRole("progressbar", { name: "Прогресс до первого обмена" })).toHaveAttribute(
        "aria-valuenow",
        "40",
      );
    } finally {
      await prisma.verificationToken.deleteMany({ where: { identifier: `email-verify:${email}` } });
      await prisma.user.deleteMany({ where: { email } });
    }
  });
});
