import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";

export function passwordResetIdentifier(email: string) {
  return `password-reset:${email}`;
}

export function emailVerifyIdentifier(email: string) {
  return `email-verify:${email}`;
}

export async function createAuthToken(identifier: string, hoursValid: number) {
  const token = nanoid(48);
  const expires = new Date(Date.now() + hoursValid * 60 * 60 * 1000);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({ data: { identifier, token, expires } });

  return token;
}

export async function consumeAuthToken(identifier: string, token: string) {
  const record = await prisma.verificationToken.findFirst({
    where: { identifier, token, expires: { gt: new Date() } },
  });
  if (!record) return false;

  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: record.identifier, token: record.token } },
  });
  return true;
}
