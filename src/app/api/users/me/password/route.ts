import bcrypt from "bcryptjs";
import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { invalidateUserSessionState } from "@/lib/auth";
import { requireUserId } from "@/server/session";
import { PASSWORD_MAX_LENGTH, checkPassword, describePasswordRejection } from "@/lib/password-policy";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Введите текущий пароль"),
  newPassword: z.string().max(PASSWORD_MAX_LENGTH),
});

export async function PATCH(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkActionRateLimit(auth.userId, "users:change-password");
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const body = await parseJson(req);
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Некорректные данные", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { passwordHash: true, email: true, name: true },
  });
  if (!user?.passwordHash) return errorResponse("Пользователь не найден", 404);

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return errorResponse("Неверный текущий пароль", 403);

  const passwordRejection = checkPassword(parsed.data.newPassword, {
    email: user.email,
    name: user.name,
  });
  if (passwordRejection) return errorResponse(describePasswordRejection(passwordRejection), 400);

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: auth.userId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });
  await invalidateUserSessionState(auth.userId);

  return actionResponse({ ok: true, reauthenticate: true }, { ok: true });
}
