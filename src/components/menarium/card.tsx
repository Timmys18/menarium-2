import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass-card rounded-[24px] sm:rounded-[28px]", className)} {...props} />;
}

export function HoverCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass-card glass-card-hover rounded-[24px] sm:rounded-[28px]", className)} {...props} />;
}

export function PremiumCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass-card relative overflow-hidden rounded-[28px] border border-white/12 sm:rounded-[32px]",
        className,
      )}
      {...props}
    />
  );
}
