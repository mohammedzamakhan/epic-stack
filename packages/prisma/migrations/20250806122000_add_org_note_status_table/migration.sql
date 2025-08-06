-- Create table for Kanban statuses (columns)
CREATE TABLE "OrganizationNoteStatus" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "OrganizationNoteStatus_organizationId_name_key" ON "OrganizationNoteStatus"("organizationId", "name");
CREATE INDEX "OrganizationNoteStatus_organizationId_idx" ON "OrganizationNoteStatus"("organizationId");
CREATE INDEX "OrganizationNoteStatus_organizationId_position_idx" ON "OrganizationNoteStatus"("organizationId", "position");