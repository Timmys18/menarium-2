import type { ReactNode } from "react";

export function AppShell({
  children,
}: {
  children: ReactNode;
  mode?: "app" | "auth";
}) {
  return children;
}
