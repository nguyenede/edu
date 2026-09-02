-- Link class assignments to generated/uploaded document files.
ALTER TABLE "Assignment" ADD COLUMN "documentFileId" TEXT;

CREATE INDEX "Assignment_documentFileId_idx" ON "Assignment"("documentFileId");

ALTER TABLE "Assignment"
ADD CONSTRAINT "Assignment_documentFileId_fkey"
FOREIGN KEY ("documentFileId") REFERENCES "DocumentFile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

