"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { MenariumButton } from "@/components/menarium/button";

export function SignOutButton() {
  return (
    <MenariumButton variant="secondary" onClick={() => signOut({ callbackUrl: "/" })}>
      <LogOut className="h-5 w-5" />
      Выйти
    </MenariumButton>
  );
}
