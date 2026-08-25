-- DropForeignKey
ALTER TABLE "option_values" DROP CONSTRAINT "option_values_optionId_fkey";

-- AddForeignKey
ALTER TABLE "option_values" ADD CONSTRAINT "option_values_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "product_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
