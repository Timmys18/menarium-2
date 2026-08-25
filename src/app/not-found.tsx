import { SearchX } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MenariumLinkButton } from "@/components/menarium/button";

export default function NotFound() {
  return (
    <AppShell>
      <div className="flex min-h-screen items-center justify-center px-6 pb-32 pt-24 md:pt-28">
        <div className="glass-card max-w-xl rounded-3xl p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white/62">
          <SearchX className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold">Страница не найдена</h1>
        <p className="mt-3 text-white/62">
          Возможно, объявление удалено или ссылка устарела. Вернитесь в каталог и выберите другой вариант.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <MenariumLinkButton href="/catalog">Открыть каталог</MenariumLinkButton>
          <MenariumLinkButton href="/" variant="secondary">На главную</MenariumLinkButton>
        </div>
        </div>
      </div>
    </AppShell>
  );
}
