import type { ReactNode } from "react";
import { GlassCard } from "@/components/menarium/card";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-24">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-display mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-teal-400/80">
            Menarium
          </p>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-white/55">{subtitle}</p>
        </div>
        <GlassCard className="relative overflow-hidden p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
          {children}
        </GlassCard>
      </div>
    </div>
  );
}
