import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "border border-blue-300/20 bg-gradient-to-r from-blue-500 to-teal-400 text-white font-semibold shadow-[0_14px_34px_rgba(77,141,255,0.22)] hover:shadow-[0_18px_42px_rgba(56,214,178,0.2)]",
  secondary: "border border-line-default bg-fill-2 text-text-primary font-semibold shadow-sm hover:border-line-strong hover:bg-fill-3",
  ghost: "text-text-subtle hover:bg-fill-2 hover:text-text-primary",
  danger: "bg-red-500/15 text-danger border border-red-500/30 hover:bg-red-500/25",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-12 px-4 py-2 text-sm",
  md: "min-h-12 px-5 py-3 text-sm sm:px-6 sm:text-base",
  lg: "min-h-14 px-7 py-3.5 text-base sm:px-8",
};

export type MenariumButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/*
  Выключенная кнопка должна читаться как выключенная.

  Прежний `disabled:opacity-50` приглушал только текст, а градиент оставался
  насыщенным — на экране входа кнопка «Войти» выглядела одновременно активной
  и блёклой, и было непонятно, нажимается она или нет. Убираем градиент
  полностью и заливаем плоским нейтральным цветом: сигнал становится
  однозначным, а не «наполовину».
*/
const disabledAppearance =
  "disabled:pointer-events-none disabled:border-line-hairline disabled:bg-fill-2 disabled:bg-none disabled:text-text-faint disabled:shadow-none";

const baseAppearance =
  "inline-flex items-center justify-center gap-2 rounded-control transition hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

export function MenariumButton({
  className,
  variant = "primary",
  size = "md",
  ...props
}: MenariumButtonProps) {
  return (
    <button
      className={cn(baseAppearance, disabledAppearance, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export function MenariumLinkButton({
  href,
  children,
  className,
  variant = "primary",
  size = "md",
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  Pick<LinkProps, "prefetch"> & {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link
      href={href}
      className={cn(baseAppearance, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </Link>
  );
}
