import "server-only";

import { Prisma, SwapStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1_000;
const ZERO_BIGINT = BigInt(0);

type TrafficRow = {
  pageViews: bigint;
  uniqueVisitors: bigint;
  sessions: bigint;
};

type BusinessRow = {
  itemsCreated: bigint;
  uniqueCreators: bigint;
  swapsProposed: bigint;
  uniqueProposers: bigint;
  proposalsAccepted: bigint;
  swapsCompleted: bigint;
};

type LatencyRow = {
  medianFirstItemHours: number | null;
  medianAcceptHours: number | null;
  medianCompleteHours: number | null;
};

type TrendRow = {
  day: string;
  pageViews: bigint;
  registrations: bigint;
  items: bigint;
  proposals: bigint;
  completions: bigint;
};

function toNumber(value: bigint | number | null | undefined) {
  return Number(value ?? 0);
}

function moscowDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1_000) / 10 : null;
}

export async function getProductAnalyticsDashboard(now = new Date()) {
  const periodStart = new Date(now.getTime() - 30 * DAY_MS);
  const trendStart = new Date(now.getTime() - 14 * DAY_MS);

  const [cohortUsers, trafficResult, businessResult, latencyResult, trendResult] = await Promise.all([
    prisma.user.findMany({
      where: { createdAt: { gte: periodStart } },
      select: { id: true, emailVerified: true },
    }),
    prisma.$queryRaw<TrafficRow[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE "name" = 'page_view')::bigint AS "pageViews",
        COUNT(DISTINCT "anonymousId") FILTER (WHERE "name" = 'page_view')::bigint AS "uniqueVisitors",
        COUNT(DISTINCT "sessionId") FILTER (WHERE "name" = 'page_view')::bigint AS "sessions"
      FROM "ProductEvent"
      WHERE "occurredAt" >= ${periodStart}
    `),
    prisma.$queryRaw<BusinessRow[]>(Prisma.sql`
      SELECT
        (SELECT COUNT(*)::bigint FROM "Item" WHERE "createdAt" >= ${periodStart}) AS "itemsCreated",
        (SELECT COUNT(DISTINCT "ownerId")::bigint FROM "Item" WHERE "createdAt" >= ${periodStart}) AS "uniqueCreators",
        (SELECT COUNT(*)::bigint FROM "SwapRequest" WHERE "createdAt" >= ${periodStart}) AS "swapsProposed",
        (SELECT COUNT(DISTINCT "senderId")::bigint FROM "SwapRequest" WHERE "createdAt" >= ${periodStart}) AS "uniqueProposers",
        (SELECT COUNT(*)::bigint FROM "SwapRequest" WHERE "createdAt" >= ${periodStart} AND "acceptedAt" IS NOT NULL) AS "proposalsAccepted",
        (SELECT COUNT(*)::bigint FROM "SwapRequest" WHERE "createdAt" >= ${periodStart} AND "status" = 'COMPLETED') AS "swapsCompleted"
    `),
    prisma.$queryRaw<LatencyRow[]>(Prisma.sql`
      SELECT
        (
          SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (first_item."createdAt" - first_item."userCreatedAt")) / 3600
          )::double precision
          FROM (
            SELECT users."id", users."createdAt" AS "userCreatedAt", MIN(items."createdAt") AS "createdAt"
            FROM "User" users
            JOIN "Item" items ON items."ownerId" = users."id"
            WHERE users."createdAt" >= ${periodStart}
            GROUP BY users."id", users."createdAt"
          ) first_item
        ) AS "medianFirstItemHours",
        (
          SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM ("acceptedAt" - "createdAt")) / 3600
          )::double precision
          FROM "SwapRequest"
          WHERE "createdAt" >= ${periodStart} AND "acceptedAt" IS NOT NULL
        ) AS "medianAcceptHours",
        (
          SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM ("completedAt" - "acceptedAt")) / 3600
          )::double precision
          FROM "SwapRequest"
          WHERE "createdAt" >= ${periodStart} AND "completedAt" IS NOT NULL AND "acceptedAt" IS NOT NULL
        ) AS "medianCompleteHours"
    `),
    prisma.$queryRaw<TrendRow[]>(Prisma.sql`
      WITH activity AS (
        SELECT TO_CHAR(DATE_TRUNC('day', "occurredAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow'), 'YYYY-MM-DD') AS day,
               COUNT(*)::bigint AS "pageViews", 0::bigint AS registrations, 0::bigint AS items,
               0::bigint AS proposals, 0::bigint AS completions
        FROM "ProductEvent"
        WHERE "occurredAt" >= ${trendStart} AND "name" = 'page_view'
        GROUP BY day
        UNION ALL
        SELECT TO_CHAR(DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow'), 'YYYY-MM-DD'),
               0::bigint, COUNT(*)::bigint, 0::bigint, 0::bigint, 0::bigint
        FROM "User" WHERE "createdAt" >= ${trendStart} GROUP BY 1
        UNION ALL
        SELECT TO_CHAR(DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow'), 'YYYY-MM-DD'),
               0::bigint, 0::bigint, COUNT(*)::bigint, 0::bigint, 0::bigint
        FROM "Item" WHERE "createdAt" >= ${trendStart} GROUP BY 1
        UNION ALL
        SELECT TO_CHAR(DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow'), 'YYYY-MM-DD'),
               0::bigint, 0::bigint, 0::bigint, COUNT(*)::bigint, 0::bigint
        FROM "SwapRequest" WHERE "createdAt" >= ${trendStart} GROUP BY 1
        UNION ALL
        SELECT TO_CHAR(DATE_TRUNC('day', "completedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow'), 'YYYY-MM-DD'),
               0::bigint, 0::bigint, 0::bigint, 0::bigint, COUNT(*)::bigint
        FROM "SwapRequest" WHERE "completedAt" >= ${trendStart} GROUP BY 1
      )
      SELECT day,
             SUM("pageViews")::bigint AS "pageViews",
             SUM(registrations)::bigint AS registrations,
             SUM(items)::bigint AS items,
             SUM(proposals)::bigint AS proposals,
             SUM(completions)::bigint AS completions
      FROM activity
      GROUP BY day
      ORDER BY day
    `),
  ]);

  const traffic = trafficResult[0] ?? {
    pageViews: ZERO_BIGINT,
    uniqueVisitors: ZERO_BIGINT,
    sessions: ZERO_BIGINT,
  };
  const business = businessResult[0] ?? {
    itemsCreated: ZERO_BIGINT,
    uniqueCreators: ZERO_BIGINT,
    swapsProposed: ZERO_BIGINT,
    uniqueProposers: ZERO_BIGINT,
    proposalsAccepted: ZERO_BIGINT,
    swapsCompleted: ZERO_BIGINT,
  };
  const latency = latencyResult[0] ?? {
    medianFirstItemHours: null,
    medianAcceptHours: null,
    medianCompleteHours: null,
  };

  const cohortIds = cohortUsers.map((user) => user.id);
  const [cohortCreators, cohortProposers, cohortCompleters] = cohortIds.length
    ? await Promise.all([
        prisma.item.findMany({
          where: { ownerId: { in: cohortIds }, createdAt: { gte: periodStart } },
          distinct: ["ownerId"],
          select: { ownerId: true },
        }),
        prisma.swapRequest.findMany({
          where: { senderId: { in: cohortIds }, createdAt: { gte: periodStart } },
          distinct: ["senderId"],
          select: { senderId: true },
        }),
        prisma.swapRequest.findMany({
          where: {
            senderId: { in: cohortIds },
            createdAt: { gte: periodStart },
            status: SwapStatus.COMPLETED,
          },
          distinct: ["senderId"],
          select: { senderId: true },
        }),
      ])
    : [[], [], []];

  const registered = cohortUsers.length;
  const verified = cohortUsers.filter((user) => user.emailVerified).length;
  const createdItem = cohortCreators.length;
  const proposedSwap = cohortProposers.length;
  const completedSwap = cohortCompleters.length;
  const itemsCreated = toNumber(business.itemsCreated);
  const swapsProposed = toNumber(business.swapsProposed);
  const proposalsAccepted = toNumber(business.proposalsAccepted);
  const swapsCompleted = toNumber(business.swapsCompleted);

  const trendByDay = new Map(trendResult.map((row) => [row.day, row]));
  const trend = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now.getTime() - (13 - index) * DAY_MS);
    const day = moscowDateKey(date);
    const row = trendByDay.get(day);
    return {
      day,
      pageViews: toNumber(row?.pageViews),
      registrations: toNumber(row?.registrations),
      items: toNumber(row?.items),
      proposals: toNumber(row?.proposals),
      completions: toNumber(row?.completions),
    };
  });

  return {
    periodStart,
    generatedAt: now,
    traffic: {
      pageViews: toNumber(traffic.pageViews),
      uniqueVisitors: toNumber(traffic.uniqueVisitors),
      sessions: toNumber(traffic.sessions),
    },
    business: {
      itemsCreated,
      uniqueCreators: toNumber(business.uniqueCreators),
      swapsProposed,
      uniqueProposers: toNumber(business.uniqueProposers),
      proposalsAccepted,
      swapsCompleted,
      acceptanceRate: percent(proposalsAccepted, swapsProposed),
      completionRate: percent(swapsCompleted, proposalsAccepted),
    },
    cohort: [
      { key: "registered", label: "Регистрация", value: registered, rate: percent(registered, registered) },
      { key: "verified", label: "Подтвердили email", value: verified, rate: percent(verified, registered) },
      { key: "created_item", label: "Создали вещь", value: createdItem, rate: percent(createdItem, registered) },
      { key: "proposed_swap", label: "Предложили обмен", value: proposedSwap, rate: percent(proposedSwap, registered) },
      { key: "completed_swap", label: "Завершили обмен", value: completedSwap, rate: percent(completedSwap, registered) },
    ],
    latency: {
      medianFirstItemHours: latency.medianFirstItemHours,
      medianAcceptHours: latency.medianAcceptHours,
      medianCompleteHours: latency.medianCompleteHours,
    },
    trend,
  };
}

export type ProductAnalyticsDashboard = Awaited<ReturnType<typeof getProductAnalyticsDashboard>>;
