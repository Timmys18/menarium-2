import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const retentionDays = Number(process.env.PRODUCT_ANALYTICS_RETENTION_DAYS ?? 180);

if (!Number.isInteger(retentionDays) || retentionDays < 30 || retentionDays > 730) {
  console.error("PRODUCT_ANALYTICS_RETENTION_DAYS must be an integer between 30 and 730.");
  process.exit(1);
}

try {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1_000);
  const result = await prisma.productEvent.deleteMany({ where: { occurredAt: { lt: cutoff } } });
  console.log(`Pruned ${result.count} product analytics events older than ${retentionDays} days.`);
} finally {
  await prisma.$disconnect();
}
