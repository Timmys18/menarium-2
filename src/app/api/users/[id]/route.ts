import { actionResponse, errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/server/session";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  const auth = await requireUserId();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      city: true,
      image: true,
      createdAt: true,
      _count: {
        select: {
          items: true,
          sentSwaps: true,
          receivedSwaps: true,
        },
      },
    },
  });

  if (!user) return errorResponse("Пользователь не найден", 404);

  return actionResponse({
    ...user,
    createdAt: user.createdAt.toISOString(),
  });
}
