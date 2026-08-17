import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MAX_SERIALIZABLE_ATTEMPTS = 3;
const SERIALIZABLE_MAX_WAIT_MS = 5_000;
const SERIALIZABLE_TIMEOUT_MS = 15_000;

export function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

export async function runSerializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: SERIALIZABLE_MAX_WAIT_MS,
        timeout: SERIALIZABLE_TIMEOUT_MS,
      });
    } catch (error) {
      if (!isPrismaError(error, "P2034") || attempt === MAX_SERIALIZABLE_ATTEMPTS) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 25));
    }
  }

  throw new Error("SERIALIZABLE_TRANSACTION_FAILED");
}
