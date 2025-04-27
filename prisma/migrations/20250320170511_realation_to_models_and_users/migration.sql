/*
  Warnings:

  - You are about to drop the `_TableModelReferences` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TableReference" DROP CONSTRAINT "TableReference_userId_fkey";

-- DropForeignKey
ALTER TABLE "_TableModelReferences" DROP CONSTRAINT "_TableModelReferences_A_fkey";

-- DropForeignKey
ALTER TABLE "_TableModelReferences" DROP CONSTRAINT "_TableModelReferences_B_fkey";

-- AlterTable
ALTER TABLE "TableReference" ADD COLUMN     "tableModelId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- DropTable
DROP TABLE "_TableModelReferences";

-- AddForeignKey
ALTER TABLE "TableReference" ADD CONSTRAINT "TableReference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableReference" ADD CONSTRAINT "TableReference_tableModelId_fkey" FOREIGN KEY ("tableModelId") REFERENCES "TableModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
