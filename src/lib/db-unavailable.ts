import { Prisma } from "@prisma/client";

export function isDbUnavailableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P1000" || error.code === "P1001";
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message);
    return message.includes("Authentication failed") || message.includes("Can't reach database");
  }
  return false;
}
