import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass-card rounded-[22px] sm:rounded-[28px]", className)} {...props} />;
}

export function HoverCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("surface-card surface-card-hover rounded-[22px] sm:rounded-[28px]", className)} {...props} />;
}

export function SurfaceCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("surface-card rounded-[18px] sm:rounded-[22px]", className)} {...props} />;
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
