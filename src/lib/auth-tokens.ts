import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";

type ConsumedToken<T> = { ok: true; value: T } | { ok: false };

function hashAuthToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function passwordResetIdentifier(email: string) {
  return `password-reset:${email}`;
}

export function emailVerifyIdentifier(email: string) {
  return `email-verify:${email}`;
}

export async function createAuthToken(identifier: string, hoursValid: number) {
  const token = nanoid(48);
  const expires = new Date(Date.now() + hoursValid * 60 * 60 * 1000);
  const tokenHash = hashAuthToken(token);

  await prisma.$transaction(async (tx) => {
    await tx.verificationToken.deleteMany({ where: { identifier } });
    await tx.verificationToken.create({ data: { identifier, token: tokenHash, expires } });
  });

  return token;
}

export async function consumeAuthToken<T>(
  identifier: string,
  token: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<ConsumedToken<T>> {
  return prisma.$transaction(async (tx) => {
    const record = await tx.verificationToken.findFirst({
      // Raw-token fallback keeps links issued immediately before deployment valid.
      where: { identifier, token: { in: [hashAuthToken(token), token] }, expires: { gt: new Date() } },
    });
    if (!record) return { ok: false };

    const value = await operation(tx);
    await tx.verificationToken.delete({
      where: { identifier_token: { identifier: record.identifier, token: record.token } },
    });
    return { ok: true, value };
  });
}
