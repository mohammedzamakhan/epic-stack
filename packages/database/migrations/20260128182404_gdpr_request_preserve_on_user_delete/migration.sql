-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DataSubjectRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    "completedAt" DATETIME,
    "cancelledAt" DATETIME,
    "scheduledFor" DATETIME,
    "executedAt" DATETIME,
    "failureReason" TEXT,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "DataSubjectRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DataSubjectRequest" ("cancelledAt", "completedAt", "executedAt", "failureReason", "id", "ipAddress", "metadata", "processedAt", "requestedAt", "scheduledFor", "status", "type", "userAgent", "userId") SELECT "cancelledAt", "completedAt", "executedAt", "failureReason", "id", "ipAddress", "metadata", "processedAt", "requestedAt", "scheduledFor", "status", "type", "userAgent", "userId" FROM "DataSubjectRequest";
DROP TABLE "DataSubjectRequest";
ALTER TABLE "new_DataSubjectRequest" RENAME TO "DataSubjectRequest";
CREATE INDEX "DataSubjectRequest_userId_type_status_idx" ON "DataSubjectRequest"("userId", "type", "status");
CREATE INDEX "DataSubjectRequest_status_scheduledFor_idx" ON "DataSubjectRequest"("status", "scheduledFor");
CREATE INDEX "DataSubjectRequest_requestedAt_idx" ON "DataSubjectRequest"("requestedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
