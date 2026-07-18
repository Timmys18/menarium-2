import process from "node:process";

const baseUrl = (process.env.SMOKE_BASE_URL ?? process.argv[2] ?? "").replace(/\/$/, "");
const expectedRelease = process.env.EXPECTED_RELEASE?.trim();
const requireEdgeHeaders = process.env.REQUIRE_EDGE_HEADERS === "true";

if (!baseUrl) {
  console.error("SMOKE_BASE_URL or the first command argument is required.");
  process.exit(1);
}

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
    headers: { "User-Agent": "Menarium-Release-Smoke/1.0" },
  });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response;
}

function requireHeader(response, header, expectedPart) {
  const value = response.headers.get(header);
  if (!value || (expectedPart && !value.toLowerCase().includes(expectedPart.toLowerCase()))) {
    throw new Error(`${response.url} is missing a valid ${header} header`);
  }
}

const liveResponse = await request("/api/health/live");
const live = await liveResponse.json();
if (live.ok !== true) throw new Error("Liveness response is not healthy");

const readyResponse = await request("/api/health/ready");
requireHeader(readyResponse, "cache-control", "no-store");
const ready = await readyResponse.json();
if (ready.ok !== true || ready.checks?.database !== "ok" || ready.checks?.redis !== "ok") {
  throw new Error("Readiness response reports an unavailable dependency");
}
if (expectedRelease && ready.release !== expectedRelease) {
  throw new Error(`Expected release ${expectedRelease}, received ${ready.release}`);
}
if (!ready.release || new Set(["development", "unknown", "latest"]).has(ready.release)) {
  throw new Error("Readiness response does not expose an immutable release identifier");
}

for (const path of ["/", "/auth/login", "/robots.txt", "/sitemap.xml"]) {
  const response = await request(path);
  requireHeader(response, "x-content-type-options", "nosniff");
  requireHeader(response, "content-security-policy", "default-src 'self'");
  if (baseUrl.startsWith("https://")) {
    requireHeader(response, "strict-transport-security", "max-age=");
  }
  if (requireEdgeHeaders) requireHeader(response, "x-request-id");
  await response.body?.cancel();
}

console.log(`Release smoke passed for ${baseUrl} (${ready.release}).`);
