import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { checkActionRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";

function serializeUser(user: {
  id: string;
  email: string;
  name: string | null;
  city: string | null;
  image: string | null;
  createdAt: Date;
}) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function GET() {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true, name: true, city: true, image: true, createdAt: true },
  });
  if (!user) return errorResponse("Пользователь не найден", 404);

  return actionResponse(serializeUser(user), serializeUser(user));
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  image: z
    .string()
    .refine((value) => value === "" || value.startsWith("/") || z.string().url().safeParse(value).success, {
      message: "Image URL must be absolute or app-relative",
    })
    .optional()
    .or(z.literal("")),
});

export async function PATCH(req: Request) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const rate = await checkActionRateLimit(auth.userId, "users:update-profile");
  if (!rate.ok) return errorResponse(rate.error, rate.status, { retryAfterSec: rate.retryAfterSec });

  const body = await parseJson(req);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Некорректные данные профиля", 400);

  const user = await prisma.user.update({
    where: { id: auth.userId },
    data: {
      name: parsed.data.name || null,
      city: parsed.data.city || null,
      image: parsed.data.image || null,
    },
    select: { id: true, email: true, name: true, city: true, image: true, createdAt: true },
  });

  return actionResponse(serializeUser(user), serializeUser(user));
}
