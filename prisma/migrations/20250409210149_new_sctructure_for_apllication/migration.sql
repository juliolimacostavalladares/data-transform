/*
  Warnings:

  - You are about to drop the `TableModel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TableReference` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DbmsType" AS ENUM ('POSTGRESQL', 'MYSQL', 'SQLSERVER', 'ORACLE', 'SQLITE');

-- CreateEnum
CREATE TYPE "DatabaseStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');

-- DropForeignKey
ALTER TABLE "TableModel" DROP CONSTRAINT "TableModel_userId_fkey";

-- DropForeignKey
ALTER TABLE "TableReference" DROP CONSTRAINT "TableReference_tableModelId_fkey";

-- DropForeignKey
ALTER TABLE "TableReference" DROP CONSTRAINT "TableReference_userId_fkey";

-- DropTable
DROP TABLE "TableModel";

-- DropTable
DROP TABLE "TableReference";

-- CreateTable
CREATE TABLE "Database" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dbmsType" "DbmsType" NOT NULL DEFAULT 'POSTGRESQL',
    "status" "DatabaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Database_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Database_name_key" ON "Database"("name");

-- AddForeignKey
ALTER TABLE "Database" ADD CONSTRAINT "Database_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
