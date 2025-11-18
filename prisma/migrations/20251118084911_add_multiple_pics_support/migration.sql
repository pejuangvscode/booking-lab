-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "adminNote" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "image" TEXT,
ADD COLUMN     "picId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_picId_fkey" FOREIGN KEY ("picId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
