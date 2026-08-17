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
    const original = document.startViewTransition?.bind(document);
    if (!original) return;
    const expectedTypes = ["item-open", "item-created", "exchange-proposed", "exchange-accepted"];
    const increment = (type: string, phase: "called" | "ready") => {
      const key = `menarium-view-transition-${type}-${phase}`;
      sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key) ?? "0") + 1));
    };
    document.startViewTransition = (options) => {
      const explicitTypes =
        typeof options === "object" && options !== null && "types" in options
          ? [...(options.types ?? [])]
          : [];
      explicitTypes.forEach((type) => increment(type, "called"));
      const transition = original(options);
      void transition.ready.then(() => {
        // Next 16 passes transition types through React.addTransitionType. React
        // adds them to the active browser transition rather than to `options`.
        const activeTypes = expectedTypes.filter((type) => {
          try {
            return document.documentElement.matches(`:active-view-transition-type(${type})`);
          } catch {
            return false;
          }
        });
        const observedTypes = [...new Set([...explicitTypes, ...activeTypes])];
        observedTypes.forEach((type) => {
          if (!explicitTypes.includes(type)) increment(type, "called");
          increment(type, "ready");
          sessionStorage.removeItem(`menarium-view-transition-${type}-error`);
        });
        if (observedTypes.length > 0) sessionStorage.removeItem("menarium-view-transition-last-error");
      }).catch((error) => {
        sessionStorage.setItem("menarium-view-transition-last-error", String(error));
        explicitTypes.forEach((type) => {
          sessionStorage.setItem(`menarium-view-transition-${type}-error`, String(error));
        });
      });
      return transition;
    };
  });
}

async function resetTransitionState(page: Page, type: string) {
  await page.evaluate((transitionType) => {
    const prefix = `menarium-view-transition-${transitionType}`;
    sessionStorage.removeItem(`${prefix}-called`);
    sessionStorage.removeItem(`${prefix}-ready`);
    sessionStorage.removeItem(`${prefix}-error`);
    sessionStorage.removeItem("menarium-view-transition-last-error");
  }, type);
}

async function transitionState(page: Page, type: string) {
  return page.evaluate((transitionType) => {
    const prefix = `menarium-view-transition-${transitionType}`;
    return {
      called: Number(sessionStorage.getItem(`${prefix}-called`) ?? "0"),
      ready: Number(sessionStorage.getItem(`${prefix}-ready`) ?? "0"),
      error:
        sessionStorage.getItem(`${prefix}-error`) ??
        sessionStorage.getItem("menarium-view-transition-last-error"),
    };
  }, type);
}

async function login(page: Page) {
  await page.goto("/auth/login");
  await page.getByLabel("Электронная почта").fill(maria.email);
  await page.getByLabel("Пароль").fill(maria.password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), {
    waitUntil: "commit",
    timeout: 30_000,
  });
}

test("catalog card keeps visual continuity when item opens", async ({ page }) => {
  await trackNativeViewTransitions(page);
  await page.goto("/catalog");
  expect(await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)).toBeFalsy();
  await resetTransitionState(page, "item-open");
  const itemLink = page.getByRole("link", { name: /Открыть объявление/ }).first();
  await expect(itemLink).toBeVisible();
  await itemLink.click();
  await page.waitForURL(/\/item\//, { waitUntil: "commit" });
  await expect.poll(async () => (await transitionState(page, "item-open")).called).toBeGreaterThan(0);
  await expect.poll(async () => (await transitionState(page, "item-open")).ready).toBeGreaterThan(0);
  expect((await transitionState(page, "item-open")).error).toBeNull();
});

test("accepting an exchange transitions into a clear active-deal stage", async ({ page }) => {
  const fixture = prepareAuditFixture();
  await trackNativeViewTransitions(page);
  await login(page);
  await page.goto(`/exchange?tab=incoming&swap=${fixture.incomingPendingSwapId}`);
  await resetTransitionState(page, "exchange-accepted");
  const main = page.getByRole("main");
  await expect(main.getByText("Нужно ваше решение", { exact: true })).toBeVisible();
  await main.getByRole("button", { name: "Принять", exact: true }).click();
  await page.getByRole("button", { name: "Принять обмен", exact: true }).click();
  await page.waitForURL(/notice=accepted/, { waitUntil: "commit" });
  await expect(main.getByText("Договоритесь о деталях в чате", { exact: true })).toBeVisible();
  await expect(main.locator("[data-exchange-progress='accepted']")).toBeVisible();
  await expect.poll(async () => (await transitionState(page, "exchange-accepted")).called).toBeGreaterThan(0);
  await expect.poll(async () => (await transitionState(page, "exchange-accepted")).ready).toBeGreaterThan(0);
  expect((await transitionState(page, "exchange-accepted")).error).toBeNull();
});
