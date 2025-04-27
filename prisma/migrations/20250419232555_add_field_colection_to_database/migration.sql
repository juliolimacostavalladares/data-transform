/*
  Warnings:

  - You are about to drop the column `dataLabels` on the `Database` table. All the data in the column will be lost.
  - You are about to drop the column `fieldDescriptions` on the `Database` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Database" DROP COLUMN "dataLabels",
DROP COLUMN "fieldDescriptions",
ADD COLUMN     "collections" JSONB;
