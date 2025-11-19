-- CreateTable
CREATE TABLE "OrganizationNoteStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrganizationNoteStatus_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "statusId" TEXT,
    "position" INTEGER,
    CONSTRAINT "OrganizationNote_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "OrganizationNoteStatus" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrganizationNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrganizationNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OrganizationNote" ("content", "createdAt", "createdById", "id", "isPublic", "organizationId", "title", "updatedAt") SELECT "content", "createdAt", "createdById", "id", "isPublic", "organizationId", "title", "updatedAt" FROM "OrganizationNote";
DROP TABLE "OrganizationNote";
ALTER TABLE "new_OrganizationNote" RENAME TO "OrganizationNote";
CREATE INDEX "OrganizationNote_organizationId_idx" ON "OrganizationNote"("organizationId");
CREATE INDEX "OrganizationNote_createdById_idx" ON "OrganizationNote"("createdById");
CREATE INDEX "OrganizationNote_organizationId_updatedAt_idx" ON "OrganizationNote"("organizationId", "updatedAt");
CREATE INDEX "OrganizationNote_organizationId_statusId_position_idx" ON "OrganizationNote"("organizationId", "statusId", "position");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OrganizationNoteStatus_organizationId_idx" ON "OrganizationNoteStatus"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationNoteStatus_organizationId_position_idx" ON "OrganizationNoteStatus"("organizationId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationNoteStatus_organizationId_name_key" ON "OrganizationNoteStatus"("organizationId", "name");
