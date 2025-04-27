/*
  Warnings:

  - A unique constraint covering the columns `[dbNameReference]` on the table `Database` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dbNameReference` to the `Database` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Database" ADD COLUMN     "dbNameReference" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Database_dbNameReference_key" ON "Database"("dbNameReference");
