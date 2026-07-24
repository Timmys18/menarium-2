-- CreateTable
CREATE TABLE "ItemView" (
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemView_pkey" PRIMARY KEY ("userId","itemId")
);

-- CreateIndex
CREATE INDEX "ItemView_userId_viewedAt_idx" ON "ItemView"("userId", "viewedAt");

-- CreateIndex
CREATE INDEX "ItemView_itemId_viewedAt_idx" ON "ItemView"("itemId", "viewedAt");

-- AddForeignKey
ALTER TABLE "ItemView" ADD CONSTRAINT "ItemView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemView" ADD CONSTRAINT "ItemView_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
