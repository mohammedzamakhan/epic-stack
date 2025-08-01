-- CreateTable
CREATE TABLE "OrganizationNoteFavorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationNoteFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrganizationNoteFavorite_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "OrganizationNote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OrganizationNoteFavorite_userId_idx" ON "OrganizationNoteFavorite"("userId");

-- CreateIndex
CREATE INDEX "OrganizationNoteFavorite_noteId_idx" ON "OrganizationNoteFavorite"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationNoteFavorite_userId_noteId_key" ON "OrganizationNoteFavorite"("userId", "noteId");
