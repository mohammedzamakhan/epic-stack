-- AlterTable: Add new fields to AuditLog for enhanced tracking
ALTER TABLE "AuditLog" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "resourceType" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "resourceId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "targetUserId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'info';
ALTER TABLE "AuditLog" ADD COLUMN "retainUntil" DATETIME;
ALTER TABLE "AuditLog" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: Audit Log Retention Policy
CREATE TABLE "AuditLogRetentionPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL DEFAULT 365,
    "hotStorageDays" INTEGER NOT NULL DEFAULT 180,
    "archiveEnabled" BOOLEAN NOT NULL DEFAULT true,
    "exportEnabled" BOOLEAN NOT NULL DEFAULT true,
    "complianceType" TEXT,
    "immutable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AuditLogRetentionPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditLogRetentionPolicy_organizationId_key" ON "AuditLogRetentionPolicy"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLogRetentionPolicy_organizationId_idx" ON "AuditLogRetentionPolicy"("organizationId");

-- CreateIndex: New indexes on AuditLog for better query performance
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");
CREATE INDEX "AuditLog_archived_retainUntil_idx" ON "AuditLog"("archived", "retainUntil");
CREATE INDEX "AuditLog_targetUserId_idx" ON "AuditLog"("targetUserId");
