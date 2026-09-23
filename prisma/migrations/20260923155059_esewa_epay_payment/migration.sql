-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "esewaRefId" TEXT,
ADD COLUMN     "esewaTransactionUuid" TEXT;

-- CreateIndex
CREATE INDEX "orders_esewaTransactionUuid_idx" ON "orders"("esewaTransactionUuid");
