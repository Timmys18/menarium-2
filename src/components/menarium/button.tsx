import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "border border-blue-300/20 bg-gradient-to-r from-blue-500 to-teal-400 text-white font-semibold shadow-[0_14px_34px_rgba(77,141,255,0.22)] hover:shadow-[0_18px_42px_rgba(56,214,178,0.2)]",
  secondary: "border border-white/12 bg-white/[0.055] text-white font-semibold shadow-sm hover:border-white/20 hover:bg-white/[0.09]",
  ghost: "text-white/62 hover:bg-white/[0.055] hover:text-white",
  danger: "bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-11 px-4 py-2 text-sm",
  md: "min-h-12 px-5 py-3 text-sm sm:px-6 sm:text-base",
  lg: "min-h-14 px-7 py-3.5 text-base sm:px-8",
};

export type MenariumButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function MenariumButton({
  className,
  variant = "primary",
  size = "md",
  ...props
}: MenariumButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[14px] transition duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a10]",
        variants[variant],
        sizes[size],
        className,
      )}
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
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[14px] transition duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a10]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
