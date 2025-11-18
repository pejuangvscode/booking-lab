/*
  Warnings:

  - You are about to drop the `_LabPIC` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_LabPIC" DROP CONSTRAINT "_LabPIC_A_fkey";

-- DropForeignKey
ALTER TABLE "_LabPIC" DROP CONSTRAINT "_LabPIC_B_fkey";

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "picIds" TEXT;

-- DropTable
DROP TABLE "_LabPIC";
