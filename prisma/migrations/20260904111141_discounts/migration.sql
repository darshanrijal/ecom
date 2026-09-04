/*
  Warnings:

  - Added the required column `originalPrice` to the `product_skus` table without a default value. This is not possible if the table is not empty.
  - Made the column `imageUrl` on table `product_skus` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "product_skus" ADD COLUMN     "originalPrice" DECIMAL(10,2) NOT NULL,
ALTER COLUMN "imageUrl" SET NOT NULL;
