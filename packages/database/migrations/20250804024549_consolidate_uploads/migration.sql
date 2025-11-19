/*
  Warnings:

  - You are about to drop the `OrganizationNoteImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrganizationNoteVideo` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OrganizationNoteImage";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OrganizationNoteVideo";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "OrganizationNoteUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "altText" TEXT,
    "objectKey" TEXT NOT NULL,
    "thumbnailKey" TEXT,
    "duration" INTEGER,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "noteId" TEXT NOT NULL,
    CONSTRAINT "OrganizationNoteUpload_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "OrganizationNote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OrganizationNoteUpload_noteId_idx" ON "OrganizationNoteUpload"("noteId");

-- CreateIndex
CREATE INDEX "OrganizationNoteUpload_type_idx" ON "OrganizationNoteUpload"("type");

-- CreateIndex
CREATE INDEX "OrganizationNoteUpload_status_idx" ON "OrganizationNoteUpload"("status");

-- CreateIndex
CREATE INDEX "OrganizationNoteUpload_noteId_type_idx" ON "OrganizationNoteUpload"("noteId", "type");
