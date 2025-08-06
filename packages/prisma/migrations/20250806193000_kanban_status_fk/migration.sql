-- 1) Create OrganizationNoteStatus table
CREATE TABLE "OrganizationNoteStatus" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "OrganizationNoteStatus_orgId_name_unique" ON "OrganizationNoteStatus"("organizationId","name");
CREATE INDEX "OrganizationNoteStatus_org_idx" ON "OrganizationNoteStatus"("organizationId");

-- 2) Alter OrganizationNote: add statusId, position, FK & composite index
ALTER TABLE "OrganizationNote" ADD COLUMN "statusId" TEXT;
ALTER TABLE "OrganizationNote" ADD COLUMN "position" INTEGER;
ALTER TABLE "OrganizationNote" ADD FOREIGN KEY ("statusId") REFERENCES "OrganizationNoteStatus"("id") ON DELETE SET NULL;
CREATE INDEX "OrganizationNote_org_status_pos_idx" ON "OrganizationNote"("organizationId","statusId","position");