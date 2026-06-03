import { NextRequest, NextResponse } from "next/server";

export const API_VERSION = "v1";

export type Paging = {
  limit: number;
  offset: number;
};

export function getPaging(req: NextRequest, defaultLimit = 20, maxLimit = 50): Paging {
  const rawLimit = Number(req.nextUrl.searchParams.get("limit"));
  const rawOffset = Number(req.nextUrl.searchParams.get("offset"));

  return {
    limit: Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, maxLimit) : defaultLimit,
    offset: Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0,
  };
}

export function listResponse<T>(
  items: T[],
  paging: Paging,
  total: number,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json({
    items,
    hasMore: paging.offset + items.length < total,
    limit: paging.limit,
    offset: paging.offset,
    total,
    ...extra,
  });
}

export function actionResponse<T>(
  data: T,
  extra: Record<string, unknown> = {},
  status = 200,
) {
  return NextResponse.json(
    {
      ok: true,
      data,
      ...extra,
    },
    { status },
  );
}

export function errorResponse(error: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

export function parseJson<T = unknown>(req: Request): Promise<T> {
  return req.json().catch(() => ({} as T));
}
