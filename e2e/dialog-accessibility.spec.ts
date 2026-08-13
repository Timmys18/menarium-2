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

test.use(iphone13);

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

test("диалог удерживает фокус и возвращает его к исходному действию", async ({ page }) => {
  resetSeedData();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/auth/login");
  await page.getByLabel("Электронная почта").fill(MARIA.email);
  await page.getByLabel("Пароль").fill(MARIA.password);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"));
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.locator("#main-content").first().waitFor({ state: "visible" });

  const trigger = page.getByRole("button", { name: "Поставить объявление на паузу" }).first();
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Приостановить объявление?" });
  await expect(dialog).toBeVisible();
  await expect(page.locator("#menarium-app")).toHaveAttribute("inert", "");
  await expect(page.locator("#menarium-app")).toHaveAttribute("aria-hidden", "true");
  await expect.poll(() => dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);

  const reducedMotionDuration = await dialog.evaluate((node) => getComputedStyle(node).animationDuration);
  expect(["0.01ms", "1e-05s"]).toContain(reducedMotionDuration);

  await page.keyboard.press("Shift+Tab");
  await expect.poll(() => dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  const undersizedControls = await page.locator("button, a, input, select, textarea").evaluateAll((elements) =>
    elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none" || rect.width === 0 || rect.height === 0) return [];
      return rect.width < 44 || rect.height < 44
        ? [{ label: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.tagName, width: rect.width, height: rect.height }]
        : [];
    }),
  );
  expect(undersizedControls).toEqual([]);
});
