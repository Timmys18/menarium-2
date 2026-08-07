import type { Prisma } from "@prisma/client";

type AdminAuditInput = {
  actorId: string;
  action: string;
  targetType: "User" | "Item" | "Report";
  targetId: string;
  reason?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/** The audit record is written in the same transaction as the moderation decision. */
export function recordAdminAction(tx: Prisma.TransactionClient, input: AdminAuditInput) {
  return tx.adminAction.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason || null,
      metadata: input.metadata,
    },
  });
}
