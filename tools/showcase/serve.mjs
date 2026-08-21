/*
 * Запускает боевую сборку одного проекта.
 *
 * Отдельный скрипт, а не `scripts/playwright-next-server.mjs`, потому что тот
 * выставляет `E2E_TEST_MODE` и открывает служебные маршруты для тестов. Здесь
 * витрина: тестовых лазеек быть не должно.
 *
 * Standalone-сервер Next.js сам не читает `.env` и не копирует к себе
 * статику — и то и другое делаем явно.
 *
 * Использование: node serve.mjs ../../menarium-v1
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
/*
 * `@next/env` берётся из самого проекта, а не по абсолютному пути: три копии
 * связаны жёсткими ссылками с репозиторием, но полагаться на это нельзя —
 * копии могут разойтись по версиям зависимостей.
 *
 * Импорт по умолчанию, а не именованный: пакет собран как CommonJS, и
 * `import { loadEnvConfig }` на нём падает.
 */
const nextEnvUrl = pathToFileURL(path.join(process.argv[2] ?? ".", "node_modules/@next/env/dist/index.js")).href;
const nextEnv = (await import(nextEnvUrl)).default;

const { loadEnvConfig } = nextEnv;

const projectDir = process.argv[2];
if (!projectDir) throw new Error("Укажите каталог проекта: node serve.mjs ../../menarium-v1");

process.chdir(projectDir);
loadEnvConfig(projectDir, false);

/*
 * `loadEnvConfig` не перекрывает уже заданные переменные — так работает
 * dotenv. Если оболочка, из которой запускают, сама держит PORT или
 * DATABASE_URL от другого варианта (легко получить, разок сделав
 * `. ./.env` в соседнем каталоге), проект молча поднимется на чужом порту
 * и с чужой базой. Собственный `.env` проекта обязан побеждать.
 */
const ownEnv = readFileSync(path.join(projectDir, ".env"), "utf8");
for (const line of ownEnv.split("\n")) {
  const match = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
  if (!match) continue;
  process.env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
}

const standaloneRoot = path.join(projectDir, ".next", "standalone");
if (!existsSync(path.join(standaloneRoot, "server.js"))) {
  throw new Error(`Нет боевой сборки в ${projectDir}. Сначала: npm run build`);
}

// public/ рядом с сервером, но без загруженных пользователями файлов.
const publicSource = path.join(projectDir, "public");
const publicTarget = path.join(standaloneRoot, "public");
rmSync(publicTarget, { recursive: true, force: true });
cpSync(publicSource, publicTarget, {
  recursive: true,
  filter(source) {
    const rel = path.relative(publicSource, source);
    return rel !== "uploads" && !rel.startsWith(`uploads${path.sep}`);
  },
});
mkdirSync(path.join(publicTarget, "uploads"), { recursive: true });

const staticSource = path.join(projectDir, ".next", "static");
const staticTarget = path.join(standaloneRoot, ".next", "static");
rmSync(staticTarget, { recursive: true, force: true });
mkdirSync(path.dirname(staticTarget), { recursive: true });
cpSync(staticSource, staticTarget, { recursive: true });

process.env.HOSTNAME = "127.0.0.1";
process.env.PORT = process.env.PORT ?? "3000";

process.chdir(standaloneRoot);
await import(pathToFileURL(path.join(standaloneRoot, "server.js")).href);
