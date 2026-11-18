-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "host" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "skip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slotMinute" INTEGER;
