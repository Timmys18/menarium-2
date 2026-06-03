import { SearchX } from "lucide-react";
import { MenariumLinkButton } from "@/components/menarium/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="glass-card max-w-xl rounded-3xl p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white/60">
          <SearchX className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold">Страница не найдена</h1>
        <p className="mt-3 text-white/55">
          Возможно, объявление удалено, ссылка устарела или маршрут еще не опубликован.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <MenariumLinkButton href="/catalog">Открыть каталог</MenariumLinkButton>
          <MenariumLinkButton href="/" variant="secondary">На главную</MenariumLinkButton>
        </div>
      </div>
    </div>
  );
}
