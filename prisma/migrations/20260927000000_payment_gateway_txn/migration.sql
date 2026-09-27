-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "esewaTransactionUuid" TEXT,
ADD COLUMN     "khaltiPidx" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_esewaTransactionUuid_key" ON "orders"("esewaTransactionUuid");

-- CreateIndex
CREATE UNIQUE INDEX "orders_khaltiPidx_key" ON "orders"("khaltiPidx");

