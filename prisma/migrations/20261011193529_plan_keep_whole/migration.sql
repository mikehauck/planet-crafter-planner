-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "keep_whole" TEXT[] DEFAULT ARRAY[]::TEXT[];
