import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLockup } from "@/components/menarium/brand";
import { SurfaceCard } from "@/components/menarium/card";

export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="page-enter flex min-h-dvh items-center px-4 py-8 sm:px-6 sm:py-12">
      <section className="mx-auto w-full max-w-md">
        <Link
          href="/"
          aria-label="Менариум — на главную"
          className="mb-10 inline-flex min-h-11 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
        >
          <BrandLockup priority />
        </Link>
        <div className="mb-6">
          <h1 className="type-page-title text-3xl sm:text-4xl">{title}</h1>
        </div>
        <SurfaceCard className="rounded-[22px] p-5 sm:p-7">{children}</SurfaceCard>
      </section>
    </div>
  );
}
