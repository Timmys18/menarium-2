import { NextResponse } from "next/server";
import { clearRateLimitsForE2e } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const secret = process.env.E2E_TEST_RESET_KEY;
  if (
    process.env.E2E_TEST_MODE !== "true" ||
    !secret ||
    request.headers.get("x-e2e-reset-key") !== secret
  ) {
    return new NextResponse(null, { status: 404 });
  }

  await clearRateLimitsForE2e();
  return new NextResponse(null, { status: 204 });
}
