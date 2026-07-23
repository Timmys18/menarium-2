-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REPORT_UPDATED';

-- AlterTable
ALTER TABLE "Report"
ADD COLUMN "swapId" TEXT;

-- CreateIndex
CREATE INDEX "Report_swapId_status_idx" ON "Report"("swapId", "status");

-- AddForeignKey
ALTER TABLE "Report"
ADD CONSTRAINT "Report_swapId_fkey"
FOREIGN KEY ("swapId") REFERENCES "SwapRequest"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
