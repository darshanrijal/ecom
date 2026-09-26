-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "khaltiPidx" TEXT,
ADD COLUMN     "khaltiTransactionId" TEXT;

-- CreateIndex
CREATE INDEX "orders_khaltiPidx_idx" ON "orders"("khaltiPidx");
