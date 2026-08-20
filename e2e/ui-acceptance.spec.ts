import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import path from "node:path";

const maria = { email: "maria@menarium.ru", password: "MenariumDemo2026!" };

const viewports = [
  { name: "320x800", width: 320, height: 800, isMobile: true, hasTouch: true },
  { name: "390x844", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "768x1024", width: 768, height: 1024, isMobile: false, hasTouch: false },
  { name: "1440x1000", width: 1440, height: 1000, isMobile: false, hasTouch: false },
] as const;

type Fixture = {
  ownItemId: string;
  otherItemId: string;
  swapId: string;
  incomingPendingSwapId: string;
  incomingAcceptedSwapId: string;
  threadId: string;
};

function logProgress(message: string) {
  console.log(`[ui-acceptance] ${message}`);
}

function resetSeedData() {
  const result = spawnSync(process.execPath, ["prisma/seed.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, ALLOW_PROD_SEED: "true" },
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(`Seed reset failed:\n${result.stdout}\n${result.stderr}`);
}

function createIsolatedFixture(): Fixture {
  const result = spawnSync(process.execPath, ["scripts/create-ui-acceptance-fixture.mjs", "--audit-states"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(`Fixture creation failed:\n${result.stdout}\n${result.stderr}`);
  return JSON.parse(result.stdout) as Fixture;
}

async function login(page: Page) {
  await gotoRoute(page, "/auth/login");
  await page.getByLabel("Электронная почта").fill(maria.email);
  await page.getByLabel("Пароль").fill(maria.password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), {
    waitUntil: "commit",
    timeout: 30_000,
  });
}

async function gotoRoute(page: Page, route: string) {
  const response = await page.goto(route, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  expect(response?.ok(), `${route} returned ${response?.status() ?? "no response"}`).toBeTruthy();
}

async function touchTargetViolations(page: Page, route: string, viewport: string) {
  return page.locator("button, a[href], input:not([type='hidden']), textarea, select, summary, [role='button'], [role='link'], [role='tab'], [role='switch'], [role='checkbox']").evaluateAll((elements, input) => {
    const isVisible = (element: Element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const visuallyClipped = style.clip === "rect(0px, 0px, 0px, 0px)" || style.clipPath === "inset(50%)";
      return !visuallyClipped && style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };
    const labelFor = (element: Element) => {
      if (!(element instanceof HTMLInputElement)) return null;
      const wrappingLabel = element.closest("label");
      if (wrappingLabel) return wrappingLabel.getBoundingClientRect();
      return element.id ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.getBoundingClientRect() ?? null : null;
    };
    return elements.flatMap((element) => {
      if (!isVisible(element) || element.closest("[aria-hidden='true'], [inert]")) return [];
      if (element.matches(":disabled, [aria-disabled='true']")) return [];
      const parent = element.parentElement;
      if (element instanceof HTMLAnchorElement && window.getComputedStyle(element).display === "inline" && parent?.matches("p, li, span, label") && (parent.textContent?.trim().length ?? 0) > 80) return [];
      const rect = element.getBoundingClientRect();
      const labelRect = labelFor(element);
      // Сравниваем ровно то число, которое потом покажем в отчёте.
      // `getBoundingClientRect` отдаёт дробные значения, и кнопка, заданная
      // как `min-h-11` (те самые 44px), временами меряется как 43.99 —
      // округление при выводе превращало это в нарушение с описанием
      // «44x44», то есть отчёт противоречил сам себе. Десятой доли пикселя
      // достаточно: реальная нехватка размера видна и на ней.
      const width = Math.round(Math.max(rect.width, labelRect?.width ?? 0) * 10) / 10;
      const height = Math.round(Math.max(rect.height, labelRect?.height ?? 0) * 10) / 10;
      if (width >= 44 && height >= 44) return [];
      const label = element.getAttribute("aria-label") || element.textContent?.replace(/\s+/g, " ").trim() || element.getAttribute("title") || element.tagName.toLowerCase();
      return [{ route: input.route, viewport: input.viewport, label, selector: element.outerHTML.slice(0, 220), width, height }];
    });
  }, { route, viewport });
}

async function expectNoCriticalAxeViolations(page: Page, route: string) {
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(violations, `${route}\n${violations.map((violation) => `${violation.id}: ${violation.help}`).join("\n")}`).toEqual([]);
}

async function assertPageFitsViewport(page: Page, route: string, viewport: string) {
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
  expect(dimensions.scrollWidth, `${route} at ${viewport} overflows horizontally`).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
}

async function expectVisibleKeyboardFocus(page: Page, selector: string, context: string) {
  // `.first()` — как и везде в этом файле: сразу после перехода в документе
  // на ~100–300 мс могут оказаться две копии страницы (Next.js сводит
  // устаревший префетч со свежим SSR-ответом), и строгий режим падает на
  // двух одинаковых совпадениях. Проверку это не ослабляет: фокус всё равно
  // ставится на настоящий интерактивный элемент и проверяется на нём.
  const label = page.getByText(selector, { exact: true }).first();
  await label.evaluate((element) => {
    const target = element.closest<HTMLElement>("a, button, input, select, textarea, [tabindex]");
    if (!target) throw new Error(`No interactive ancestor for ${element.textContent}`);
    target.dataset.acceptanceFocusTarget = "true";
    target.scrollIntoView({ behavior: "instant", block: "center" });
  });
  const target = page.locator('[data-acceptance-focus-target="true"]');
  await expect(target, context).toBeVisible();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  for (let index = 0; index < 100; index += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => document.activeElement === element)) break;
  }
  const focusStyle = await target.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      focused: document.activeElement === element,
      outline: `${style.outlineStyle} ${style.outlineWidth}`,
      shadow: style.boxShadow,
    };
  });
  expect(focusStyle.focused, `${context}: element did not receive focus`).toBeTruthy();
  expect(
    focusStyle.outline !== "none 0px" || (focusStyle.shadow !== "none" && focusStyle.shadow.length > 0),
    `${context}: no visible focus indicator (${JSON.stringify(focusStyle)})`,
  ).toBeTruthy();
}

async function waitForSettledMain(page: Page) {
  await page.waitForFunction(() => !document.documentElement.hasAttribute("data-view-transition-active"));
  await page.waitForFunction(() => {
    const mains = document.querySelectorAll("#main-content");
    const main = mains.item(0);
    return mains.length === 1 && main instanceof HTMLElement && main.offsetWidth > 0 && main.offsetHeight > 0;
  });
  // Let React finish the first paint before measuring geometry and contrast.
  await page.waitForTimeout(100);
}

test.describe("final UI acceptance matrix", () => {
  for (const viewport of viewports) {
    test(`checks accessibility, touch targets and layout at ${viewport.name}`, async ({ browser }) => {
      test.setTimeout(300_000);
      resetSeedData();
      const fixture = createIsolatedFixture();
      const context = await browser.newContext({ viewport, isMobile: viewport.isMobile, hasTouch: viewport.hasTouch });
      const page = await context.newPage();
      const browserErrors: string[] = [];
      page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error") {
          const location = message.location();
          browserErrors.push(`console: ${message.text()}${location.url ? ` (${location.url}:${location.lineNumber}:${location.columnNumber})` : ""}`);
        }
      });
      try {
        const violations: unknown[] = [];
        for (const route of ["/auth/login", "/auth/register"]) {
          await test.step(`${viewport.name}: public ${route}`, async () => {
            await gotoRoute(page, route);
            await waitForSettledMain(page);
            await assertPageFitsViewport(page, route, viewport.name);
            violations.push(...await touchTargetViolations(page, route, viewport.name));
            await expectNoCriticalAxeViolations(page, route);
          });
        }

        await login(page);
        const routes = [
          "/",
          "/catalog",
          "/favorites",
          "/swipe",
          "/notifications",
          `/item/${fixture.otherItemId}`,
          "/new",
          `/item/${fixture.ownItemId}/edit`,
          "/profile?welcome=1",
          "/profile/edit",
          "/profile/safety",
          "/profile/chats",
          `/profile/chats/item/${fixture.threadId}`,
          `/exchange?tab=matches&swap=${fixture.swapId}`,
          `/profile/exchanges?tab=matches&swap=${fixture.swapId}`,
          `/exchange?tab=incoming&swap=${fixture.incomingPendingSwapId}`,
          `/profile/exchanges?tab=matches&swap=${fixture.incomingAcceptedSwapId}&notice=accepted`,
        ];

        for (const route of routes) {
          await test.step(`${viewport.name}: ${route}`, async () => {
            logProgress(`${viewport.name} ${route}: goto`);
            await gotoRoute(page, route);
            logProgress(`${viewport.name} ${route}: main`);
            await waitForSettledMain(page);
            const main = page.locator("#main-content");
            await expect(main).toHaveCount(1);
            await expect(main).toBeVisible();
            logProgress(`${viewport.name} ${route}: layout`);
            await assertPageFitsViewport(page, route, viewport.name);
            logProgress(`${viewport.name} ${route}: touch`);
            violations.push(...await touchTargetViolations(page, route, viewport.name));
            logProgress(`${viewport.name} ${route}: axe`);
            await expectNoCriticalAxeViolations(page, route);
            logProgress(`${viewport.name} ${route}: done`);
          });
        }

        await gotoRoute(page, `/exchange?tab=incoming&swap=${fixture.incomingPendingSwapId}`);
        await waitForSettledMain(page);
        logProgress(`${viewport.name} incoming focus`);
        await expectVisibleKeyboardFocus(
          page,
          viewport.width >= 1024 ? "Посмотреть входящие" : "← Все обмены",
          `${viewport.name}: incoming action`,
        );

        await gotoRoute(page, `/profile/exchanges?tab=matches&swap=${fixture.incomingAcceptedSwapId}&notice=accepted`);
        await waitForSettledMain(page);
        logProgress(`${viewport.name} accepted focus`);
        await expectVisibleKeyboardFocus(
          page,
          viewport.width >= 1024 ? "Открыть чат ↓" : "← Все обмены",
          `${viewport.name}: accepted chat action`,
        );

        logProgress(`${viewport.name} image upload`);
        await gotoRoute(page, "/new");
        await waitForSettledMain(page);
        const imageInput = page.locator("#item-images");
        await expect(imageInput).toBeAttached();
        await page.waitForFunction(() => {
          const input = document.querySelector("#item-images");
          return Boolean(input && Object.keys(input).some((key) => key.startsWith("__reactProps$")));
        });
        const [uploadResponse] = await Promise.all([
          page.waitForResponse((response) => response.url().endsWith("/api/media") && response.request().method() === "POST"),
          imageInput.setInputFiles(path.join(process.cwd(), "assets", "demo", "items", "canon.png")),
        ]);
        expect(uploadResponse.ok(), await uploadResponse.text()).toBeTruthy();
        const removeImageButton = page.getByRole("button", { name: "Удалить фото 1" });
        await expect(removeImageButton).toBeVisible();
        violations.push(...await touchTargetViolations(page, "/new after image upload", viewport.name));
        await expectNoCriticalAxeViolations(page, "/new after image upload");
        await removeImageButton.click();
        await expect(removeImageButton).toHaveCount(0);

        logProgress(`${viewport.name} edit image controls`);
        await gotoRoute(page, `/item/${fixture.ownItemId}/edit`);
        await waitForSettledMain(page);
        violations.push(...await touchTargetViolations(page, `/item/${fixture.ownItemId}/edit`, viewport.name));

        logProgress(`${viewport.name} city filter`);
        await gotoRoute(page, "/catalog");
        await waitForSettledMain(page);
        if (viewport.width < 1024) await page.getByText("Фильтры", { exact: true }).click();
        await page.getByRole("button", { name: /Выберите город/ }).click();
        violations.push(...await touchTargetViolations(page, "/catalog with city filter", viewport.name));
        await expectNoCriticalAxeViolations(page, "/catalog with city filter");

        logProgress(`${viewport.name} pause dialog`);
        await gotoRoute(page, "/profile");
        await waitForSettledMain(page);
        const pause = page.getByRole("button", { name: "Поставить объявление на паузу" }).first();
        if (await pause.count()) {
          await pause.click();
          await expect(page.getByRole("dialog")).toBeVisible();
          violations.push(...await touchTargetViolations(page, "/profile pause dialog", viewport.name));
          await expectNoCriticalAxeViolations(page, "/profile pause dialog");
        }

        expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
        expect(browserErrors, browserErrors.join("\n")).toEqual([]);
        logProgress(`${viewport.name} complete`);
      } finally {
        await context.close();
        logProgress(`${viewport.name} context closed`);
      }
    });
  }
});
