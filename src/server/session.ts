import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function getCurrentUserIdentity() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id || !user.email) return null;

  return { id: user.id, email: user.email, emailVerified: Boolean(user.emailVerified) };
}

export async function getCurrentUserId() {
  return (await getCurrentUserIdentity())?.id ?? null;
}

export async function requireUserId() {
  const identity = await getCurrentUserIdentity();
  if (!identity) {
    return { ok: false as const, response: errorResponse("Необходимо войти в систему.", 401) };
  }
  return { ok: true as const, userId: identity.id, emailVerified: Boolean(identity.emailVerified) };
}
