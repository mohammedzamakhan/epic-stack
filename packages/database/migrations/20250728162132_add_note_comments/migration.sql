-- CreateTable
CREATE TABLE "NoteComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NoteComment_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "OrganizationNote" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NoteComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NoteComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NoteComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NoteComment_noteId_idx" ON "NoteComment"("noteId");

-- CreateIndex
CREATE INDEX "NoteComment_userId_idx" ON "NoteComment"("userId");

-- CreateIndex
CREATE INDEX "NoteComment_parentId_idx" ON "NoteComment"("parentId");

-- CreateIndex
CREATE INDEX "NoteComment_noteId_createdAt_idx" ON "NoteComment"("noteId", "createdAt");
