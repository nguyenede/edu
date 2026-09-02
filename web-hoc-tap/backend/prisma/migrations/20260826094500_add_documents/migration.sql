CREATE TABLE "DocumentFolder" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentFolder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentFile" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "storageKey" TEXT,
    "parsedQuiz" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentFolder_ownerId_parentId_idx" ON "DocumentFolder"("ownerId", "parentId");
CREATE INDEX "DocumentFile_ownerId_folderId_idx" ON "DocumentFile"("ownerId", "folderId");

ALTER TABLE "DocumentFolder"
ADD CONSTRAINT "DocumentFolder_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentFolder"
ADD CONSTRAINT "DocumentFolder_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "DocumentFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentFile"
ADD CONSTRAINT "DocumentFile_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentFile"
ADD CONSTRAINT "DocumentFile_folderId_fkey"
FOREIGN KEY ("folderId") REFERENCES "DocumentFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
