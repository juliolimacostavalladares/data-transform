-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableModel" (
    "id" TEXT NOT NULL,
    "model" JSONB NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TableModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableReference" (
    "id" TEXT NOT NULL,
    "referenceTableName" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TableReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TableModelReferences" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TableModelReferences_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "_TableModelReferences_B_index" ON "_TableModelReferences"("B");

-- AddForeignKey
ALTER TABLE "TableModel" ADD CONSTRAINT "TableModel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableReference" ADD CONSTRAINT "TableReference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TableModelReferences" ADD CONSTRAINT "_TableModelReferences_A_fkey" FOREIGN KEY ("A") REFERENCES "TableReference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TableModelReferences" ADD CONSTRAINT "_TableModelReferences_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
