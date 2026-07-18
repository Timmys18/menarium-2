import { createLivenessResponse } from "@/lib/health";

export async function GET() {
  return createLivenessResponse();
}
