-- CreateTable
CREATE TABLE "NoteCommentImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "altText" TEXT,
    "objectKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "commentId" TEXT NOT NULL,
    CONSTRAINT "NoteCommentImage_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "NoteComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NoteCommentImage_commentId_idx" ON "NoteCommentImage"("commentId");
