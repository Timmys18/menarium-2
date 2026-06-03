import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/server/session";

function adminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function getCurrentAdmin() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) return null;

  return adminEmails().has(user.email.toLowerCase()) ? user : null;
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false as const };
  return { ok: true as const, admin };
}
