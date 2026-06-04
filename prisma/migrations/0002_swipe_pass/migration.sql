-- CreateTable
CREATE TABLE "SwipePass" (
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwipePass_pkey" PRIMARY KEY ("userId","itemId")
);

-- CreateIndex
CREATE INDEX "SwipePass_userId_createdAt_idx" ON "SwipePass"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "SwipePass" ADD CONSTRAINT "SwipePass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwipePass" ADD CONSTRAINT "SwipePass_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
