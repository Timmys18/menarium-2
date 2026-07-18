import { createReadinessResponse } from "@/lib/health";

export async function GET() {
  return createReadinessResponse();
}
