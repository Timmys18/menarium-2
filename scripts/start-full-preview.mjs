import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const DB_USER = "menarium";
const DB_PASSWORD = "menarium_local_password";
const DB_NAME = "menarium2";
const DB_PORT = 5433;
const DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}?schema=public`;

function log(message) {
  console.log(`[menarium] ${message}`);
}

function updateEnvFile() {
  const envPath = path.join(root, ".env");
  const lines = existsSync(envPath) ? readFileSync(envPath, "utf8").split(/\r?\n/) : [];
  const next = new Map();

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    next.set(line.slice(0, idx), line.slice(idx + 1));
  }

  next.set("DATABASE_URL", `"${DATABASE_URL}"`);
  next.set("NEXTAUTH_URL", '"http://localhost:3000"');
  next.set("NEXTAUTH_SECRET", '"dev-only-replace-in-production"');
  next.set("APP_URL", '"http://localhost:3000"');
  next.delete("NEXT_PUBLIC_APP_URL");
  next.set("ADMIN_EMAILS", '"admin@menarium.ru"');
  next.set("STORAGE_PROVIDER", '"local"');
  next.set("STORAGE_LOCAL_DIR", '"./public/uploads"');
  next.set("STORAGE_PUBLIC_BASE_URL", '"/uploads"');
  next.set("PRODUCT_ANALYTICS_ENABLED", '"true"');
  next.set("PRODUCT_ANALYTICS_RETENTION_DAYS", '"180"');
  next.delete("REDIS_URL");

  const body = [
    "# Auto-managed by npm run preview:full",
    ...Array.from(next.entries()).map(([key, value]) => `${key}=${value}`),
    "",
  ].join("\n");

  writeFileSync(envPath, body, "utf8");
}

function run(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, ...extraEnv, DATABASE_URL },
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function isPostgresReady() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function isSiteReady() {
  try {
    const response = await fetch("http://localhost:3000/api/health");
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureDatabase(instance) {
  try {
    await instance.createDatabase(DB_NAME);
    log(`Created database ${DB_NAME}`);
  } catch {
    log(`Database ${DB_NAME} already exists`);
  }
}

async function startPostgresInstance(instance, databaseDir) {
  if (await isPostgresReady()) {
    log("PostgreSQL already running on port 5433 — reusing it.");
    return false;
  }

  if (!existsSync(path.join(databaseDir, "PG_VERSION"))) {
    await instance.initialise();
  }

  await instance.start();
  return true;
}

async function main() {
  updateEnvFile();

  if (await isSiteReady()) {
    log("Site is already running at http://localhost:3000");
    log("Demo login: maria@menarium.ru / MenariumDemo2026!");
    return;
  }

  const databaseDir = path.join(root, ".data", "postgres");

  log("Starting local PostgreSQL (no Docker, no manual setup)...");
  const embeddedPg = new EmbeddedPostgres({
    databaseDir,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: (message) => log(String(message).trim()),
    onError: (message) => console.error(String(message).trim()),
  });

  const startedByUs = await startPostgresInstance(embeddedPg, databaseDir);
  if (startedByUs) {
    await ensureDatabase(embeddedPg);
  }

  log("Applying migrations...");
  await run("npx", ["prisma", "migrate", "deploy"]);

  log("Loading demo users and listings...");
  await run("node", ["prisma/seed.mjs"]);

  log("");
  log("Full preview is ready.");
  log("Open http://localhost:3000");
  log("Demo login: maria@menarium.ru / MenariumDemo2026!");
  log("Second user for exchange: dmitry@menarium.ru / MenariumDemo2026!");
  log("Press Ctrl+C to stop the site and database.");
  log("");

  await run("npm", ["run", "dev"]);
  if (startedByUs) {
    await embeddedPg.stop();
  }
}

main().catch((error) => {
  console.error("[menarium] Failed to start full preview:", error);
  process.exit(1);
});
