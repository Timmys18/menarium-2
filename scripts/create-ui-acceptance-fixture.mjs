import { ItemStatus, PrismaClient, SwapStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const includeAuditStates = process.argv.includes("--audit-states");
  const [owner, partner] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: "maria@menarium.ru" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "dmitry@menarium.ru" } }),
  ]);
  const [ownItem, otherItem] = await Promise.all([
    prisma.item.findFirstOrThrow({ where: { ownerId: owner.id, status: ItemStatus.ACTIVE, title: "Sony WH-1000XM5" } }),
    prisma.item.findFirstOrThrow({ where: { ownerId: partner.id, status: ItemStatus.ACTIVE, title: "Canon AE-1" } }),
  ]);
  const swap = await prisma.swapRequest.create({
    data: {
      status: SwapStatus.ACCEPTED,
      senderId: owner.id,
      receiverId: partner.id,
      senderItemId: ownItem.id,
      receiverItemId: otherItem.id,
      acceptedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  const auditSwaps = includeAuditStates
    ? await Promise.all([
        prisma.swapRequest.create({
          data: {
            status: SwapStatus.PENDING,
            senderId: partner.id,
            receiverId: owner.id,
            senderItemId: otherItem.id,
            receiverItemId: ownItem.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        }),
        prisma.swapRequest.create({
          data: {
            status: SwapStatus.ACCEPTED,
            senderId: partner.id,
            receiverId: owner.id,
            senderItemId: otherItem.id,
            receiverItemId: ownItem.id,
            acceptedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        }),
      ])
    : [];
  const thread = await prisma.itemThread.upsert({
    where: { itemId_buyerId: { itemId: otherItem.id, buyerId: owner.id } },
    update: { ownerId: partner.id },
    create: { itemId: otherItem.id, buyerId: owner.id, ownerId: partner.id },
  });
  await prisma.itemThreadMessage.deleteMany({ where: { threadId: thread.id } });
  await prisma.itemThreadMessage.create({
    data: { threadId: thread.id, senderId: partner.id, text: "Проверочное сообщение для приёмки интерфейса." },
  });

  process.stdout.write(JSON.stringify({
    ownItemId: ownItem.id,
    otherItemId: otherItem.id,
    swapId: swap.id,
    incomingPendingSwapId: auditSwaps[0]?.id ?? null,
    incomingAcceptedSwapId: auditSwaps[1]?.id ?? null,
    threadId: thread.id,
  }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
