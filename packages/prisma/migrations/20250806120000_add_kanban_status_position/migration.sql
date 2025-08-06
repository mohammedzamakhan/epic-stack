-- Migration: Add status and position fields to OrganizationNote for Kanban support

ALTER TABLE "OrganizationNote"
  ADD COLUMN "status" TEXT,
  ADD COLUMN "position" INTEGER;

CREATE INDEX "OrganizationNote_organizationId_status_position_idx"
  ON "OrganizationNote" ("organizationId", "status", "position");