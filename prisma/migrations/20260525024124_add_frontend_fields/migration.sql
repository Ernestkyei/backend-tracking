-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('DOCUMENTS', 'ELECTRONICS', 'CLOTHING', 'FOOD', 'GIFTS', 'OTHER');

-- CreateEnum
CREATE TYPE "DeliveryUrgency" AS ENUM ('STANDARD', 'EXPRESS', 'SAME_DAY');

-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "additionalNotes" TEXT,
ADD COLUMN     "deliveryRegion" TEXT,
ADD COLUMN     "deliveryUrgency" "DeliveryUrgency" DEFAULT 'STANDARD',
ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "packageType" "PackageType",
ADD COLUMN     "pickupRegion" TEXT,
ADD COLUMN     "preferredPickupTime" TEXT,
ADD COLUMN     "recipientName" TEXT,
ADD COLUMN     "recipientPhone" TEXT,
ADD COLUMN     "specialInstructions" TEXT;
