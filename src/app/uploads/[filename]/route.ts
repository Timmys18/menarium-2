import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const safeFilename = /^[A-Za-z0-9_-]{20,40}\.(?:avif|gif|jpe?g|png|webp)$/i;
const contentTypes: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  if (process.env.STORAGE_PROVIDER === "s3") return new NextResponse(null, { status: 404 });

  const { filename } = await context.params;
  if (!safeFilename.test(filename)) return new NextResponse(null, { status: 404 });

  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "uploads", filename));
    const extension = filename.split(".").at(-1)?.toLowerCase() ?? "";
    return new NextResponse(bytes, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": contentTypes[extension] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new NextResponse(null, { status: 404 });
    throw error;
  }
}
