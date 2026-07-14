import { getServerSession } from "next-auth";
import { UserStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function getCurrentUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findFirst({
    where: { id: userId, status: UserStatus.ACTIVE },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function requireUserId() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false as const, response: errorResponse("Необходимо войти в систему.", 401) };
  }
  return { ok: true as const, userId };
}
