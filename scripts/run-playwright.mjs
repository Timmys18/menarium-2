import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const port = process.env.PORT ?? "3001";
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
const server = spawn(process.execPath, ["scripts/playwright-next-server.mjs"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: port },
  stdio: "inherit",
  windowsHide: true,
});

let stopping = false;

function stopServer() {
  if (stopping) return;
  stopping = true;
  if (server.exitCode !== null || !server.pid) return;

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
  } else {
    server.kill("SIGTERM");
  }
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Production server exited with code ${server.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/health/live`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Production server did not become ready at ${baseUrl}`);
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    stopServer();
    process.exit(1);
  });
}

try {
  await waitForServer();
  const cli = path.join(process.cwd(), "node_modules", "@playwright", "test", "cli.js");
  const testProcess = spawn(process.execPath, [cli, "test", ...process.argv.slice(2)], {
    cwd: process.cwd(),
    env: { ...process.env, PLAYWRIGHT_BASE_URL: baseUrl },
    stdio: "inherit",
    windowsHide: true,
  });
  const exitCode = await new Promise((resolve, reject) => {
    testProcess.once("error", reject);
    testProcess.once("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
  stopServer();
  process.exit(exitCode);
} finally {
  stopServer();
}
