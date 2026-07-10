import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.06] px-6 py-10 pb-36 md:pb-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-lg font-bold tracking-tight text-white/90">MENARIUM</p>
          <p className="mt-1 max-w-sm text-sm text-white/45">
            Премиальная платформа бартерного обмена. Без денег — только честный обмен.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/50">
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
