import Link from "next/link";
import { ItemStatus, SwapStatus } from "@prisma/client";
import { Activity, Archive, CheckCircle2, Shield, Tag, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/menarium/badge";
import { EmptyState } from "@/components/menarium/empty-state";
import { GlassCard } from "@/components/menarium/card";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/server/admin";
import { ItemModerationActions } from "./item-moderation-actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getCurrentAdmin();

  const [usersCount, activeItemsCount, archivedItemsCount, activeSwapsCount, completedSwapsCount, recentItems] = admin
    ? await Promise.all([
        prisma.user.count(),
        prisma.item.count({ where: { status: ItemStatus.ACTIVE } }),
        prisma.item.count({ where: { status: ItemStatus.ARCHIVED } }),
        prisma.swapRequest.count({ where: { status: { in: [SwapStatus.PENDING, SwapStatus.ACCEPTED] } } }),
        prisma.swapRequest.count({ where: { status: SwapStatus.COMPLETED } }),
        prisma.item.findMany({
          include: { owner: { select: { name: true, email: true } }, images: true },
          orderBy: { updatedAt: "desc" },
          take: 30,
        }),
      ])
    : [0, 0, 0, 0, 0, []];

  const stats = [
    { label: "Пользователи", value: usersCount, icon: Users, color: "text-teal-400" },
    { label: "Активные объявления", value: activeItemsCount, icon: Tag, color: "text-purple-400" },
    { label: "Архив", value: archivedItemsCount, icon: Archive, color: "text-yellow-400" },
    { label: "Активные обмены", value: activeSwapsCount, icon: Activity, color: "text-blue-400" },
    { label: "Завершенные", value: completedSwapsCount, icon: CheckCircle2, color: "text-green-400" },
  ];

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/70 to-purple-500/70">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Админ-панель</h1>
              <p className="mt-1 text-white/55">Базовый production-контур модерации Menarium.</p>
            </div>
          </div>

          {!admin ? (
            <EmptyState
              title="Доступ только для администратора"
              description="Администраторы задаются через ADMIN_EMAILS в production environment."
              actionHref="/profile"
              actionLabel="Вернуться в профиль"
            />
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <GlassCard key={stat.label} className="p-5">
                      <Icon className={`mb-3 h-5 w-5 ${stat.color}`} />
                      <div className="text-3xl font-semibold">{stat.value}</div>
                      <p className="mt-1 text-xs text-white/40">{stat.label}</p>
                    </GlassCard>
                  );
                })}
              </div>

              <GlassCard className="overflow-hidden">
                <div className="border-b border-white/[0.06] px-5 py-4">
                  <h2 className="text-xl font-semibold">Последние объявления</h2>
                  <p className="mt-1 text-sm text-white/45">Быстрая модерация: архивировать или вернуть объявление.</p>
                </div>
                {recentItems.map((item) => (
                  <div key={item.id} className="flex flex-col gap-4 border-b border-white/[0.04] px-5 py-4 last:border-b-0 md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Link href={`/item/${item.id}`} className="font-medium transition-colors hover:text-teal-300">
                          {item.title}
                        </Link>
                        <Badge variant={item.status === "ACTIVE" ? "teal" : item.status === "ARCHIVED" ? "glass" : "purple"}>
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-white/45">
                        {item.category} · {item.city} · {item.owner.name ?? item.owner.email}
                      </p>
                    </div>
                    <ItemModerationActions itemId={item.id} status={item.status} />
                  </div>
                ))}
              </GlassCard>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
