import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass-card rounded-3xl", className)} {...props} />;
}

export function HoverCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass-card glass-card-hover rounded-3xl", className)} {...props} />;
}

export function PremiumCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass-card relative overflow-hidden rounded-[32px] border-2 border-white/10",
        className,
      )}
      {...props}
    />
  );
}
