-- CreateTable
CREATE TABLE "OrganizationNoteVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "altText" TEXT,
    "objectKey" TEXT NOT NULL,
    "thumbnailKey" TEXT,
    "duration" INTEGER,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "noteId" TEXT NOT NULL,
    CONSTRAINT "OrganizationNoteVideo_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "OrganizationNote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OrganizationNoteVideo_noteId_idx" ON "OrganizationNoteVideo"("noteId");

-- CreateIndex
CREATE INDEX "OrganizationNoteVideo_status_idx" ON "OrganizationNoteVideo"("status");
