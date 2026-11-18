-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "author" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bodyImages" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "date" TEXT,
ADD COLUMN     "imageAlt" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "imageCredit" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "PostTranslation" ADD COLUMN     "lead" TEXT NOT NULL DEFAULT '';
