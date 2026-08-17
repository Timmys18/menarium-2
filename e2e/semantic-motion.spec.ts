import { expect, test, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";

const maria = { email: "maria@menarium.ru", password: "MenariumDemo2026!" };

type AuditFixture = {
  incomingPendingSwapId: string;
};

function prepareAuditFixture(): AuditFixture {
  const seed = spawnSync(process.execPath, ["prisma/seed.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, ALLOW_PROD_SEED: "true" },
    encoding: "utf8",
  });
  if (seed.status !== 0) throw new Error(`Seed reset failed:\n${seed.stdout}\n${seed.stderr}`);
  const fixture = spawnSync(process.execPath, ["scripts/create-ui-acceptance-fixture.mjs", "--audit-states"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });
  if (fixture.status !== 0) throw new Error(`Fixture creation failed:\n${fixture.stdout}\n${fixture.stderr}`);
  return JSON.parse(fixture.stdout) as AuditFixture;
}

async function trackNativeViewTransitions(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("menarium-view-transition-ready") === null) {
      sessionStorage.setItem("menarium-view-transition-ready", "0");
      sessionStorage.setItem("menarium-view-transition-called", "0");
      sessionStorage.removeItem("menarium-view-transition-error");
    }
    const original = document.startViewTransition?.bind(document);
    if (!original) return;
    document.startViewTransition = (options) => {
      const called = Number(sessionStorage.getItem("menarium-view-transition-called") ?? "0");
      sessionStorage.setItem("menarium-view-transition-called", String(called + 1));
      const transition = original(options);
      void transition.ready.then(() => {
        const ready = Number(sessionStorage.getItem("menarium-view-transition-ready") ?? "0");
        sessionStorage.setItem("menarium-view-transition-ready", String(ready + 1));
      }).catch((error) => {
        sessionStorage.setItem("menarium-view-transition-error", String(error));
      });
      return transition;
    };
  });
}

async function transitionState(page: Page) {
  return page.evaluate(() => ({
    called: Number(sessionStorage.getItem("menarium-view-transition-called") ?? "0"),
    ready: Number(sessionStorage.getItem("menarium-view-transition-ready") ?? "0"),
    error: sessionStorage.getItem("menarium-view-transition-error"),
  }));
}

async function login(page: Page) {
  await page.goto("/auth/login");
  await page.getByLabel("Электронная почта").fill(maria.email);
  await page.getByLabel("Пароль").fill(maria.password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"));
}

test("catalog card keeps visual continuity when item opens", async ({ page }) => {
  await trackNativeViewTransitions(page);
  await page.goto("/catalog");
  expect(await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)).toBeFalsy();
  const itemLink = page.getByRole("link", { name: /Открыть объявление/ }).first();
  await expect(itemLink).toBeVisible();
  await itemLink.click();
  await page.waitForURL(/\/item\//);
  await expect.poll(async () => (await transitionState(page)).called).toBeGreaterThan(0);
  await expect.poll(async () => (await transitionState(page)).ready).toBeGreaterThan(0);
  expect((await transitionState(page)).error).toBeNull();
});

test("accepting an exchange transitions into a clear active-deal stage", async ({ page }) => {
  const fixture = prepareAuditFixture();
  await trackNativeViewTransitions(page);
  await login(page);
  await page.goto(`/exchange?tab=incoming&swap=${fixture.incomingPendingSwapId}`);
  const main = page.getByRole("main");
  await expect(main.getByText("Нужно ваше решение", { exact: true })).toBeVisible();
  await main.getByRole("button", { name: "Принять", exact: true }).click();
  await page.getByRole("button", { name: "Принять обмен", exact: true }).click();
  await page.waitForURL(/notice=accepted/);
  await expect(main.getByText("Договоритесь о деталях в чате", { exact: true })).toBeVisible();
  await expect(main.locator("[data-exchange-progress='accepted']")).toBeVisible();
  await expect.poll(async () => (await transitionState(page)).called).toBeGreaterThan(0);
  await expect.poll(async () => (await transitionState(page)).ready).toBeGreaterThan(0);
  expect((await transitionState(page)).error).toBeNull();
});
