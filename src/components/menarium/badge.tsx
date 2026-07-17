import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "glass" | "gradient" | "teal" | "purple" | "danger" | "gold";

const variants: Record<BadgeVariant, string> = {
  glass: "bg-black/45 text-white/88 border-white/10",
  gradient: "bg-gradient-to-r from-blue-500/85 to-teal-400/85 text-white border-white/10",
  teal: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  purple: "bg-blue-500/15 text-blue-200 border-blue-400/25",
  danger: "bg-red-500/15 text-red-300 border-red-500/30",
  gold: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
};

export function Badge({
  className,
  variant = "glass",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-xl",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
