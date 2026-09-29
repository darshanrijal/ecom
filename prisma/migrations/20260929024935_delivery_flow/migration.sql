-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'ASSIGNED';
ALTER TYPE "OrderStatus" ADD VALUE 'OUT_FOR_DELIVERY';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveryCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryDistanceKm" DECIMAL(6,3),
ADD COLUMN     "deliveryManId" TEXT,
ADD COLUMN     "deliveryRatePerKm" DECIMAL(10,2),
ADD COLUMN     "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "storeLat" DOUBLE PRECISION,
ADD COLUMN     "storeLng" DOUBLE PRECISION,
ADD COLUMN     "subtotal" DECIMAL(10,2);

-- Backfill subtotal for existing orders: totalAmount was always the sum of
-- order items (delivery was free and no discount existed), so this is exact.
UPDATE "orders" SET "subtotal" = "totalAmount";

ALTER TABLE "orders" ALTER COLUMN "subtotal" SET NOT NULL;

-- CreateTable
CREATE TABLE "store_settings" (
    "id" TEXT NOT NULL,
    "storeLat" DOUBLE PRECISION,
    "storeLng" DOUBLE PRECISION,
    "deliveryRatePerKm" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_men" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_men_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_men_userId_key" ON "delivery_men"("userId");

-- CreateIndex
CREATE INDEX "orders_deliveryManId_idx" ON "orders"("deliveryManId");

-- AddForeignKey
ALTER TABLE "delivery_men" ADD CONSTRAINT "delivery_men_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_deliveryManId_fkey" FOREIGN KEY ("deliveryManId") REFERENCES "delivery_men"("id") ON DELETE SET NULL ON UPDATE CASCADE;
