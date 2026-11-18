-- AlterEnum
ALTER TYPE "ContentState" ADD VALUE 'SCHEDULED';

-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "airDate" TEXT,
ADD COLUMN     "episodeNo" INTEGER,
ADD COLUMN     "imageAlt" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "showFrom" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DayFeature" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "imageUrl" TEXT,
    "state" "ContentState" NOT NULL DEFAULT 'DRAFT',
    "showFrom" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayFeatureTranslation" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DayFeatureTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyGameChoice" (
    "id" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "game" TEXT NOT NULL,

    CONSTRAINT "WeeklyGameChoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DayFeature_kind_date_key" ON "DayFeature"("kind", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DayFeatureTranslation_featureId_locale_key" ON "DayFeatureTranslation"("featureId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyGameChoice_weekStart_key" ON "WeeklyGameChoice"("weekStart");

-- CreateIndex
CREATE INDEX "Episode_airDate_idx" ON "Episode"("airDate");

-- AddForeignKey
ALTER TABLE "DayFeatureTranslation" ADD CONSTRAINT "DayFeatureTranslation_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "DayFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
