"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { MenariumButton } from "@/components/menarium/button";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <MenariumButton className={className} size="sm" variant="ghost" onClick={() => signOut({ callbackUrl: "/" })}>
      <LogOut className="h-4 w-4" />
      Выйти
    </MenariumButton>
  );
}
