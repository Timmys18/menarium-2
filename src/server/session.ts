import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function getCurrentUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function requireUserId() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false as const, response: errorResponse("Необходимо войти в систему.", 401) };
  }
  return { ok: true as const, userId };
}
