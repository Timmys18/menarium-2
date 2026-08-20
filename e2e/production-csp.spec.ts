import { expect, test } from "@playwright/test";

test("production CSP permits the application and blocks unsafe scripts", async ({ page }) => {
  const violations: string[] = [];
  const blockedAssets: string[] = [];

  page.on("console", (message) => {
    const text = message.text();
    if (/content security policy|refused to (load|execute|apply)/i.test(text)) violations.push(text);
  });
  page.on("requestfailed", (request) => {
    if (["script", "stylesheet", "image", "font"].includes(request.resourceType())) {
      blockedAssets.push(`${request.resourceType()}: ${request.url()} (${request.failure()?.errorText ?? "unknown"})`);
    }
  });

  const response = await page.goto("/auth/login");
  expect(response).not.toBeNull();
  const csp = response?.headers()["content-security-policy"] ?? "";
  expect(csp).toContain("'strict-dynamic'");
  expect(csp).not.toContain("'unsafe-eval'");

  const nonceMatch = csp.match(/script-src[^;]*'nonce-([^']+)'/);
  expect(nonceMatch, "script-src must contain a nonce").not.toBeNull();
  const expectedNonce = nonceMatch?.[1];
  // application/ld+json блоки — инертные данные для поисковиков, а не код:
  // браузер их не выполняет, и CSP script-src на них не распространяется,
  // поэтому у них закономерно нет nonce. Проверяем только исполняемые скрипты.
  const scriptNonces = await page.locator("script").evaluateAll((scripts) =>
    (scripts as HTMLScriptElement[])
      .filter((script) => !script.type || /javascript|module/i.test(script.type))
      .map((script) => script.nonce),
  );
  expect(scriptNonces.length).toBeGreaterThan(0);
  expect(scriptNonces.every((nonce) => nonce === expectedNonce)).toBe(true);

  await page.getByLabel("Электронная почта").fill("maria@menarium.ru");
  await page.getByLabel("Пароль").fill("MenariumDemo2026!");
  await expect(page.getByRole("button", { name: "Войти", exact: true })).toBeEnabled();
  await page.getByRole("link", { name: "Создать аккаунт" }).click();
  await expect(page).toHaveURL(/\/auth\/register/);
  await expect(page.getByRole("heading", { name: "Добро пожаловать" })).toBeVisible();

  expect(violations, violations.join("\n")).toEqual([]);
  expect(blockedAssets, blockedAssets.join("\n")).toEqual([]);
});
