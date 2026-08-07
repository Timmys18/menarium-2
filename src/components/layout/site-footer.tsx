import Link from "next/link";
import { BrandLockup } from "@/components/menarium/brand";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.055] px-4 py-10 pb-36 sm:px-6 md:pb-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-7 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/" className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70">
            <BrandLockup markClassName="h-8 w-8 rounded-[10px]" textClassName="text-lg" />
          </Link>
          <p className="mt-3 text-sm text-white/62">© 2026 Менариум</p>
        </div>
        <nav aria-label="Ссылки в подвале" className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/62">
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
