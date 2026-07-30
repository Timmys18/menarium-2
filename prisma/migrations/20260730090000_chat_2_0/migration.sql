ALTER TYPE "MediaOwnerType" ADD VALUE IF NOT EXISTS 'CHAT';

CREATE TYPE "ChatKind" AS ENUM ('DEAL', 'ITEM');

ALTER TABLE "DealMessage"
ADD COLUMN "readAt" TIMESTAMP(3),
ADD COLUMN "replyToId" TEXT;

ALTER TABLE "ItemThreadMessage"
ADD COLUMN "readAt" TIMESTAMP(3),
ADD COLUMN "replyToId" TEXT;

ALTER TABLE "MediaAsset"
ADD COLUMN "dealMessageId" TEXT,
ADD COLUMN "itemThreadMessageId" TEXT;

CREATE TABLE "PushSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "ChatKind" NOT NULL,
  "entityId" TEXT NOT NULL,
  "muted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChatPreference_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DealMessage_replyToId_idx" ON "DealMessage"("replyToId");
CREATE INDEX "ItemThreadMessage_replyToId_idx" ON "ItemThreadMessage"("replyToId");
CREATE INDEX "MediaAsset_dealMessageId_idx" ON "MediaAsset"("dealMessageId");
CREATE INDEX "MediaAsset_itemThreadMessageId_idx" ON "MediaAsset"("itemThreadMessageId");
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_updatedAt_idx" ON "PushSubscription"("userId", "updatedAt");
CREATE UNIQUE INDEX "ChatPreference_userId_kind_entityId_key" ON "ChatPreference"("userId", "kind", "entityId");
CREATE INDEX "ChatPreference_userId_muted_updatedAt_idx" ON "ChatPreference"("userId", "muted", "updatedAt");

ALTER TABLE "DealMessage"
ADD CONSTRAINT "DealMessage_replyToId_fkey"
FOREIGN KEY ("replyToId") REFERENCES "DealMessage"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ItemThreadMessage"
ADD CONSTRAINT "ItemThreadMessage_replyToId_fkey"
FOREIGN KEY ("replyToId") REFERENCES "ItemThreadMessage"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaAsset"
ADD CONSTRAINT "MediaAsset_dealMessageId_fkey"
FOREIGN KEY ("dealMessageId") REFERENCES "DealMessage"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MediaAsset"
ADD CONSTRAINT "MediaAsset_itemThreadMessageId_fkey"
FOREIGN KEY ("itemThreadMessageId") REFERENCES "ItemThreadMessage"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PushSubscription"
ADD CONSTRAINT "PushSubscription_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatPreference"
ADD CONSTRAINT "ChatPreference_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
