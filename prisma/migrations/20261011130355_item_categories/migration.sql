-- AlterTable
ALTER TABLE "items" ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
