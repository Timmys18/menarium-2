import { Check } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/menarium/empty-state";
import { getCurrentUserId } from "@/server/session";
import { NewItemForm } from "./new-item-form";

export const dynamic = "force-dynamic";

export default async function NewItemPage() {
  const userId = await getCurrentUserId();

  return (
    <AppShell>
      <div className="min-h-screen px-6 pb-32 pt-24 md:pt-32">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12">
            <div className="mb-4 flex items-center justify-center">
              {[1, 2, 3].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className="glow-purple flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-teal-500 to-purple-500 font-bold">
                    {step === 1 ? <Check className="h-6 w-6" /> : step}
                  </div>
                  {index < 2 ? (
                    <div className="mx-2 h-1 w-20 rounded-full bg-white/10 md:w-32">
                      <div className={index === 0 ? "h-full rounded-full bg-gradient-to-r from-teal-500 to-purple-500" : ""} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="text-center">
              <h1 className="mb-2 text-3xl font-bold md:text-4xl">Что предлагаешь?</h1>
              <p className="text-white/60">Сфотографируй предмет, выбери категорию и опиши обмен</p>
            </div>
          </div>

          {userId ? (
            <NewItemForm />
          ) : (
            <EmptyState
              title="Войдите, чтобы создать объявление"
              description="Menarium привязывает объявления, фото и обмены к вашему профилю."
              actionHref="/auth/login"
              actionLabel="Войти"
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
