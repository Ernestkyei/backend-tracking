-- DropForeignKey
ALTER TABLE "Track" DROP CONSTRAINT "Track_customerId_fkey";

-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "recipientEmail" TEXT,
ADD COLUMN     "recipientId" TEXT,
ADD COLUMN     "senderEmail" TEXT,
ADD COLUMN     "senderId" TEXT,
ADD COLUMN     "senderName" TEXT,
ADD COLUMN     "senderPhone" TEXT,
ALTER COLUMN "customerName" DROP NOT NULL,
ALTER COLUMN "customerEmail" DROP NOT NULL,
ALTER COLUMN "packageType" SET DEFAULT 'OTHER';

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
