import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

/**
 * Демо-фотографии нужны только для локального превью при недоступной базе
 * (см. `loadHomeItemCards`). Раньше они лежали в `public/` и уезжали в
 * production-образ восемью мегабайтами, публично доступными по
 * `menarium.ru/demo/items/…`. Теперь они лежат в `assets/`, а этот маршрут
 * отдаёт их только вне production — ровно там, где включается сам fallback.
 */
const safeFilename = /^[a-z0-9-]{1,40}\.png$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });

  const { filename } = await context.params;
  if (!safeFilename.test(filename)) return new NextResponse(null, { status: 404 });

  try {
    const bytes = await readFile(path.join(process.cwd(), "assets", "demo", "items", filename));
    return new NextResponse(bytes, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "image/png",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new NextResponse(null, { status: 404 });
    throw error;
  }
}
