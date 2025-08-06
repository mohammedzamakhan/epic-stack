-- Alter OrganizationNote: remove status (string), add statusId (FK)
ALTER TABLE "OrganizationNote" DROP COLUMN "status";
ALTER TABLE "OrganizationNote" ADD COLUMN "statusId" TEXT;

-- Add new relation
PRAGMA foreign_keys=off;
CREATE TABLE "OrganizationNote_new" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "organizationId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "statusId" TEXT,
  "position" INTEGER,
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  FOREIGN KEY ("statusId") REFERENCES "OrganizationNoteStatus"("id") ON DELETE SET NULL
);
INSERT INTO "OrganizationNote_new" SELECT id, title, content, isPublic, createdAt, updatedAt, organizationId, createdById, statusId, position FROM "OrganizationNote";
DROP TABLE "OrganizationNote";
ALTER TABLE "OrganizationNote_new" RENAME TO "OrganizationNote";
PRAGMA foreign_keys=on;

-- Indexes
CREATE INDEX "OrganizationNote_organizationId_idx" ON "OrganizationNote"("organizationId");
CREATE INDEX "OrganizationNote_createdById_idx" ON "OrganizationNote"("createdById");
CREATE INDEX "OrganizationNote_organizationId_updatedAt_idx" ON "OrganizationNote"("organizationId","updatedAt");
CREATE INDEX "OrganizationNote_organizationId_statusId_position_idx" ON "OrganizationNote"("organizationId","statusId","position");