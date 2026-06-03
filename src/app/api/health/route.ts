import { NextResponse } from "next/server";
import { API_VERSION } from "@/lib/api";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "menarium-2",
    version: API_VERSION,
    time: new Date().toISOString(),
  });
}
