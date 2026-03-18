-- AlterTable
ALTER TABLE "CardioSession" ADD COLUMN     "equipment" TEXT,
ADD COLUMN     "inclinePercent" DOUBLE PRECISION,
ADD COLUMN     "speedKmh" DOUBLE PRECISION,
ADD COLUMN     "treadmillMode" TEXT;
