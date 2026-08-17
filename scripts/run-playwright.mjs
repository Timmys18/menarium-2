import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const port = process.env.PORT ?? "3001";
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
const cli = path.join(process.cwd(), "node_modules", "@playwright", "test", "cli.js");
const requestedArgs = process.argv.slice(2);

let activeServer;

function startServer() {
  activeServer = spawn(process.execPath, ["scripts/playwright-next-server.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: port },
    stdio: "inherit",
    windowsHide: true,
  });
  return activeServer;
}

async function stopServer(server) {
  if (!server) return;

  if (process.platform === "win32") {
    if (server.exitCode === null && server.pid) {
      spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    }

  } else {
    if (server.exitCode !== null) return;
    const exited = new Promise((resolve) => server.once("exit", resolve));
    server.kill("SIGTERM");
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5_000))]);
  }

}

async function waitForServer(server) {
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

async function runPlaywright(args) {
  const testProcess = spawn(process.execPath, [cli, "test", ...args], {
    cwd: process.cwd(),
    env: { ...process.env, PLAYWRIGHT_BASE_URL: baseUrl },
    stdio: "inherit",
    windowsHide: true,
  });
  return new Promise((resolve, reject) => {
    testProcess.once("error", reject);
    testProcess.once("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    void stopServer(activeServer);
    process.exit(1);
  });
}

let failedCode = 0;
try {
  process.stdout.write(`\n[e2e] ${requestedArgs.length ? requestedArgs.join(" ") : "full acceptance suite"}\n`);
  const server = startServer();
  await waitForServer(server);
  failedCode = await runPlaywright(requestedArgs);
} finally {
  await stopServer(activeServer);
  activeServer = undefined;
}

process.exit(failedCode);
