/*
  Warnings:

  - A unique constraint covering the columns `[userId,name]` on the table `Extraction` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Extraction_userId_name_key" ON "Extraction"("userId", "name");
