export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateProductionEnv } = await import("@/lib/env");
    validateProductionEnv();

    if (process.env.SENTRY_DSN) {
      await import("../sentry.server.config");
    }
  }

  if (process.env.NEXT_RUNTIME === "edge" && process.env.SENTRY_DSN) {
    await import("../sentry.edge.config");
  }
}

export async function onRequestError(
  err: Error,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  const { reportError } = await import("@/lib/logger");
  const requestId = request.headers["x-request-id"];
  reportError("request.unhandled_error", err, {
    path: request.path,
    method: request.method,
    requestId: Array.isArray(requestId) ? requestId[0] : requestId,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
  });
}
