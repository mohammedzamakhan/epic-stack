-- CreateTable
CREATE TABLE "NoteActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" TEXT,
    "targetUserId" TEXT,
    "integrationId" TEXT,
    "commentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NoteActivityLog_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "OrganizationNote" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NoteActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NoteActivityLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "NoteActivityLog_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NoteActivityLog_noteId_idx" ON "NoteActivityLog"("noteId");

-- CreateIndex
CREATE INDEX "NoteActivityLog_userId_idx" ON "NoteActivityLog"("userId");

-- CreateIndex
CREATE INDEX "NoteActivityLog_noteId_createdAt_idx" ON "NoteActivityLog"("noteId", "createdAt");

-- CreateIndex
CREATE INDEX "NoteActivityLog_action_idx" ON "NoteActivityLog"("action");
