-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "imageUrl" TEXT,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonTranslation" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "shows" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PersonTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonTranslation_personId_locale_key" ON "PersonTranslation"("personId", "locale");

-- AddForeignKey
ALTER TABLE "PersonTranslation" ADD CONSTRAINT "PersonTranslation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
