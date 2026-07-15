import type { DealMessage, ItemThreadMessage, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DEFAULT_CHAT_PAGE_SIZE = 40;
export const MAX_CHAT_PAGE_SIZE = 100;

export type MessagePage<T> = {
  messages: T[];
  hasOlder: boolean;
  nextCursor: string | null;
};

function clampLimit(limit: number) {
  if (!Number.isFinite(limit) || limit <= 0) return DEFAULT_CHAT_PAGE_SIZE;
  return Math.min(Math.floor(limit), MAX_CHAT_PAGE_SIZE);
}

function olderThan(cursor: { id: string; createdAt: Date }) {
  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ],
  };
}

function toPage<T extends { id: string }>(rows: T[], limit: number): MessagePage<T> {
  const hasOlder = rows.length > limit;
  const newestFirst = rows.slice(0, limit);

  return {
    messages: newestFirst.toReversed(),
    hasOlder,
    nextCursor: hasOlder ? (newestFirst.at(-1)?.id ?? null) : null,
  };
}

export async function loadDealMessagePage({
  swapId,
  before,
  limit = DEFAULT_CHAT_PAGE_SIZE,
}: {
  swapId: string;
  before?: string | null;
  limit?: number;
}): Promise<MessagePage<DealMessage>> {
  const pageLimit = clampLimit(limit);
  const cursor = before
    ? await prisma.dealMessage.findFirst({
        where: { id: before, swapId },
        select: { id: true, createdAt: true },
      })
    : null;

  if (before && !cursor) return { messages: [], hasOlder: false, nextCursor: null };

  const where: Prisma.DealMessageWhereInput = {
    swapId,
    ...(cursor ? olderThan(cursor) : {}),
  };
  const rows = await prisma.dealMessage.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageLimit + 1,
  });

  return toPage(rows, pageLimit);
}

export async function loadItemThreadMessagePage({
  threadId,
  before,
  limit = DEFAULT_CHAT_PAGE_SIZE,
}: {
  threadId: string;
  before?: string | null;
  limit?: number;
}): Promise<MessagePage<ItemThreadMessage>> {
  const pageLimit = clampLimit(limit);
  const cursor = before
    ? await prisma.itemThreadMessage.findFirst({
        where: { id: before, threadId },
        select: { id: true, createdAt: true },
      })
    : null;

  if (before && !cursor) return { messages: [], hasOlder: false, nextCursor: null };

  const where: Prisma.ItemThreadMessageWhereInput = {
    threadId,
    ...(cursor ? olderThan(cursor) : {}),
  };
  const rows = await prisma.itemThreadMessage.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageLimit + 1,
  });

  return toPage(rows, pageLimit);
}
