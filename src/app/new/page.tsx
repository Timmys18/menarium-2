import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/menarium/empty-state";
import { loginHref } from "@/lib/utils";
import { getCurrentUserId } from "@/server/session";
import { NewItemForm } from "./new-item-form";

export const dynamic = "force-dynamic";

export default async function NewItemPage() {
  const userId = await getCurrentUserId();

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-gradient-to-r from-teal-500/15 to-purple-500/15 px-4 py-1.5 text-sm text-white/70">
              <Sparkles className="h-4 w-4 text-teal-400" />
              Новое объявление
            </div>
            <h1 className="mb-2 text-3xl font-bold md:text-4xl">Что предлагаешь на обмен?</h1>
            <p className="text-white/55">Фото, описание и пожелания — всё в одной форме. Займёт пару минут.</p>
          </div>

          {userId ? (
            <NewItemForm />
          ) : (
            <EmptyState
              title="Войдите, чтобы создать объявление"
              description="Menarium привязывает объявления, фото и обмены к вашему профилю."
              actionHref={loginHref("/new")}
              actionLabel="Войти"
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
