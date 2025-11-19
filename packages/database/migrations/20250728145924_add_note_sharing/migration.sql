-- CreateTable
CREATE TABLE "NoteAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NoteAccess_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "OrganizationNote" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NoteAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrganizationNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "OrganizationNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrganizationNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OrganizationNote" ("content", "createdAt", "createdById", "id", "organizationId", "title", "updatedAt") SELECT "content", "createdAt", "createdById", "id", "organizationId", "title", "updatedAt" FROM "OrganizationNote";
DROP TABLE "OrganizationNote";
ALTER TABLE "new_OrganizationNote" RENAME TO "OrganizationNote";
CREATE INDEX "OrganizationNote_organizationId_idx" ON "OrganizationNote"("organizationId");
CREATE INDEX "OrganizationNote_createdById_idx" ON "OrganizationNote"("createdById");
CREATE INDEX "OrganizationNote_organizationId_updatedAt_idx" ON "OrganizationNote"("organizationId", "updatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "NoteAccess_noteId_idx" ON "NoteAccess"("noteId");

-- CreateIndex
CREATE INDEX "NoteAccess_userId_idx" ON "NoteAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NoteAccess_noteId_userId_key" ON "NoteAccess"("noteId", "userId");
