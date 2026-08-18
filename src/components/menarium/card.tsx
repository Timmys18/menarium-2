import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass-card rounded-card sm:rounded-lg", className)} {...props} />;
}

export function HoverCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("surface-card surface-card-hover rounded-card sm:rounded-lg", className)} {...props} />;
}

export function SurfaceCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("surface-card rounded-md sm:rounded-card", className)} {...props} />;
}

export function PremiumCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass-card relative overflow-hidden rounded-lg border border-white/10 sm:rounded-panel",
        className,
      )}
      {...props}
    />
  );
}
