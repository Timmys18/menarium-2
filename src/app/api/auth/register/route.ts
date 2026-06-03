import bcrypt from "bcryptjs";
import { z } from "zod";
import { actionResponse, errorResponse, parseJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Имя слишком короткое").max(80).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Некорректный email"),
  password: z.string().min(8, "Пароль должен быть не короче 8 символов").max(128),
});

export async function POST(req: Request) {
  const body = await parseJson(req);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Некорректные данные", 400);
  }

  const { email, password, name, city } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return errorResponse("Пользователь с таким email уже существует", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: name || null,
      city: city || null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      city: true,
    },
  });

  return actionResponse(user, {}, 201);
}
