-- AlterEnum
ALTER TYPE "SwapStatus" ADD VALUE 'EXPIRED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_PUBLISHED';
ALTER TYPE "NotificationType" ADD VALUE 'HANDOFF_UPDATED';

-- CreateEnum
CREATE TYPE "HandoffMode" AS ENUM ('IN_PERSON', 'DELIVERY', 'ONLINE');

-- AlterTable
ALTER TABLE "SwapRequest"
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "handoffMode" "HandoffMode",
ADD COLUMN "handoffScheduledAt" TIMESTAMP(3),
ADD COLUMN "handoffDetails" TEXT,
ADD COLUMN "handoffRevision" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "senderHandoffConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "receiverHandoffConfirmed" BOOLEAN NOT NULL DEFAULT false;

UPDATE "SwapRequest"
SET "expiresAt" = "createdAt" + INTERVAL '7 days';

ALTER TABLE "SwapRequest"
ALTER COLUMN "expiresAt" SET NOT NULL;

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "swapId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "visibleAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
    CONSTRAINT "Review_participants_check" CHECK ("reviewerId" <> "revieweeId")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","itemId")
);

-- CreateIndex
CREATE INDEX "SwapRequest_status_expiresAt_idx" ON "SwapRequest"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_swapId_reviewerId_key" ON "Review"("swapId", "reviewerId");

-- CreateIndex
CREATE INDEX "Review_revieweeId_visibleAt_createdAt_idx" ON "Review"("revieweeId", "visibleAt", "createdAt");

-- CreateIndex
CREATE INDEX "Review_reviewerId_createdAt_idx" ON "Review"("reviewerId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_swapId_idx" ON "Review"("swapId");

-- CreateIndex
CREATE INDEX "Favorite_userId_createdAt_idx" ON "Favorite"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Favorite_itemId_createdAt_idx" ON "Favorite"("itemId", "createdAt");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_swapId_fkey" FOREIGN KEY ("swapId") REFERENCES "SwapRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
