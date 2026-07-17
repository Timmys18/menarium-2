import Link from "next/link";
import { Repeat2 } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.055] px-4 py-10 pb-36 sm:px-6 md:pb-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-7 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-500 to-teal-400">
              <Repeat2 className="h-4 w-4" />
            </span>
            <span className="gradient-text font-display text-lg font-bold tracking-[-0.03em]">MENARIUM</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/42">
            Вещи и навыки находят новую ценность. Без денег, с понятными договорённостями.
          </p>
        </div>
        <nav aria-label="Ссылки в подвале" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/48">
          <Link href="/catalog" className="transition hover:text-white">
            Каталог
          </Link>
          <Link href="/swipe" className="transition hover:text-white">
            Свайп
          </Link>
          <Link href="/exchange" className="transition hover:text-white">
            Обмены
          </Link>
          <Link href="/privacy" className="transition hover:text-white">
            Конфиденциальность
          </Link>
          <Link href="/terms" className="transition hover:text-white">
            Соглашение
          </Link>
        </nav>
      </div>
    </footer>
  );
}
