-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'ESEWA', 'KHALTI');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'COD',
ADD COLUMN     "paymentRef" TEXT;
