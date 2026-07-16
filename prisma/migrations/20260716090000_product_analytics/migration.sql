-- CreateTable
CREATE TABLE "ProductEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "actorId" TEXT,
    "anonymousId" TEXT,
    "sessionId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "path" TEXT,
    "properties" JSONB,
    "dedupeKey" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductEvent_dedupeKey_key" ON "ProductEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "ProductEvent_name_occurredAt_idx" ON "ProductEvent"("name", "occurredAt");

-- CreateIndex
CREATE INDEX "ProductEvent_actorId_occurredAt_idx" ON "ProductEvent"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "ProductEvent_anonymousId_occurredAt_idx" ON "ProductEvent"("anonymousId", "occurredAt");

-- CreateIndex
CREATE INDEX "ProductEvent_sessionId_occurredAt_idx" ON "ProductEvent"("sessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "ProductEvent_entityType_entityId_idx" ON "ProductEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ProductEvent_occurredAt_idx" ON "ProductEvent"("occurredAt");

-- AddForeignKey
ALTER TABLE "ProductEvent" ADD CONSTRAINT "ProductEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "SwapRequest" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Backfill the best-known completion time for exchanges completed before this migration.
UPDATE "SwapRequest" SET "completedAt" = "updatedAt" WHERE "status" = 'COMPLETED';

-- CreateIndex
CREATE INDEX "SwapRequest_status_completedAt_idx" ON "SwapRequest"("status", "completedAt");
