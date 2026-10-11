-- DropIndex
DROP INDEX "items_name_key";

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "retired_at" TIMESTAMP(3);
