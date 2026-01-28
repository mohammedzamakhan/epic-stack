-- CreateTable
CREATE TABLE "DataSubjectRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
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
    CONSTRAINT "DataSubjectRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DataSubjectRequest_userId_type_status_idx" ON "DataSubjectRequest"("userId", "type", "status");

-- CreateIndex
CREATE INDEX "DataSubjectRequest_status_scheduledFor_idx" ON "DataSubjectRequest"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "DataSubjectRequest_requestedAt_idx" ON "DataSubjectRequest"("requestedAt");
