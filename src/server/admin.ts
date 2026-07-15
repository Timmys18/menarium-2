import { prisma } from "@/lib/prisma";
import { getCurrentUserIdentity } from "@/server/session";

function adminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string) {
  return adminEmails().has(email.trim().toLowerCase());
}

export async function getCurrentAdmin() {
  const identity = await getCurrentUserIdentity();
  if (!identity || !isAdminEmail(identity.email)) return null;

  return prisma.user.findUnique({
    where: { id: identity.id },
    select: { id: true, email: true, name: true },
  });
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false as const };
  return { ok: true as const, admin };
}
