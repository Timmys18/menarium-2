import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

/* Экраны входа и регистрации идут без шапки и подвала — см. `(app)/layout.tsx`. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AppShell mode="auth">{children}</AppShell>;
}
