/*
  Warnings:

  - You are about to drop the column `picId` on the `rooms` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_picId_fkey";

-- AlterTable
ALTER TABLE "rooms" DROP COLUMN "picId";

-- CreateTable
CREATE TABLE "_LabPIC" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LabPIC_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_LabPIC_B_index" ON "_LabPIC"("B");

-- AddForeignKey
ALTER TABLE "_LabPIC" ADD CONSTRAINT "_LabPIC_A_fkey" FOREIGN KEY ("A") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LabPIC" ADD CONSTRAINT "_LabPIC_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
