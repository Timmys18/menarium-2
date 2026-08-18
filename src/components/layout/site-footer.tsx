import Link from "next/link";
import { cookies } from "next/headers";
import { BrandLockup } from "@/components/menarium/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { THEME_COOKIE, parseThemeChoice } from "@/lib/theme";

export async function SiteFooter() {
  const cookieStore = await cookies();
  const theme = parseThemeChoice(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <footer className="relative z-10 border-t border-line-hairline px-4 py-10 pb-36 sm:px-6 md:pb-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-7 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/" className="inline-flex min-h-11 items-center rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
            <BrandLockup markClassName="h-8 w-8 rounded-xs" textClassName="text-lg" />
          </Link>
          <p className="mt-3 text-sm text-text-subtle">© 2026 Менариум</p>
        </div>
        <nav aria-label="Ссылки в подвале" className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-text-muted">
          <Link href="/catalog" className="inline-flex min-h-11 items-center px-2 transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
            Каталог
          </Link>
          <Link href="/swipe" className="inline-flex min-h-11 items-center px-2 transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
            Свайп
          </Link>
          <Link href="/exchange" className="inline-flex min-h-11 items-center px-2 transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
            Обмены
          </Link>
          <Link href="/privacy" className="inline-flex min-h-11 items-center px-2 transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
            Конфиденциальность
          </Link>
          <Link href="/terms" className="inline-flex min-h-11 items-center px-2 transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
            Соглашение
          </Link>
        </nav>
        <ThemeToggle initial={theme} />
      </div>
    </footer>
  );
}
