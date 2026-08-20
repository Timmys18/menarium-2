import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "neutral" | "glass" | "gradient" | "teal" | "purple" | "danger" | "gold";

/**
 * `neutral` — состояние без собственного смысла («Предмет», «Новая репутация»,
 * ветка `else` в статусных тернарниках). Держится в одном весе с цветными
 * вариантами ниже: та же лёгкая заливка и та же граница, отличается только
 * отсутствием цвета. Раньше эту роль исполнял `glass`, из-за чего на светлой
 * теме рядом с бледно-бирюзовой плашкой вставали тяжёлые тёмные «таблетки».
 *
 * `glass` — только поверх фотографии. Заливка идёт от `--surface-sunken`, а не
 * от чёрного: снимок остаётся снимком, но плашка должна принадлежать теме.
 * Текст здесь тоже обязан быть токеном — раньше он был жёстко белым
 * (`text-on-media`), и на светлой теме белое по почти белому давало контраст
 * 1.71:1 при норме 4.5:1 (замерено по пикселям карточки каталога).
 */
const variants: Record<BadgeVariant, string> = {
  neutral: "bg-fill-2 text-text-muted border-line-default",
  glass: "bg-[var(--surface-sunken)]/78 text-text-strong border-line-default",
  gradient: "bg-gradient-to-r from-blue-500/85 to-teal-400/85 text-white border-line-default",
  teal: "bg-teal-500/15 text-accent border-teal-500/30",
  purple: "bg-blue-500/15 text-info border-blue-400/25",
  danger: "bg-red-500/15 text-danger border-red-500/30",
  // Токен, а не `text-yellow-300`: светлый жёлтый читался только на тёмном
  // фоне, а на светлой теме давал 1.20:1 на собственной бледной заливке —
  // рейтинг в публичном профиле практически исчезал.
  gold: "bg-yellow-500/15 text-warning border-yellow-500/30",
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-micro font-medium backdrop-blur-xl",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
