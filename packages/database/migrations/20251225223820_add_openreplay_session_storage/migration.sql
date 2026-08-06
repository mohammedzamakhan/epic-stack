-- CreateTable
CREATE TABLE "OpenReplaySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "sessionHash" TEXT,
    "projectKey" TEXT NOT NULL,
    "userUUID" TEXT,
    "metadata" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OpenReplayMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "messageTypeId" INTEGER NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpenReplayMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OpenReplaySession" ("sessionId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Recording" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "videoObjectKey" TEXT,
    "videoThumbnailKey" TEXT,
    "videoDuration" INTEGER,
    "videoFileSize" INTEGER,
    "sessionData" TEXT,
    "openReplaySessionId" TEXT,
    "openReplaySessionHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "priority" TEXT,
    "tags" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recording_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recording_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recording_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recording_openReplaySessionId_fkey" FOREIGN KEY ("openReplaySessionId") REFERENCES "OpenReplaySession" ("sessionId") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Recording" ("createdAt", "createdById", "description", "id", "isPublic", "openReplaySessionHash", "openReplaySessionId", "organizationId", "priority", "projectId", "sessionData", "status", "tags", "title", "updatedAt", "videoDuration", "videoFileSize", "videoObjectKey", "videoThumbnailKey") SELECT "createdAt", "createdById", "description", "id", "isPublic", "openReplaySessionHash", "openReplaySessionId", "organizationId", "priority", "projectId", "sessionData", "status", "tags", "title", "updatedAt", "videoDuration", "videoFileSize", "videoObjectKey", "videoThumbnailKey" FROM "Recording";
DROP TABLE "Recording";
ALTER TABLE "new_Recording" RENAME TO "Recording";
CREATE INDEX "Recording_projectId_idx" ON "Recording"("projectId");
CREATE INDEX "Recording_organizationId_idx" ON "Recording"("organizationId");
CREATE INDEX "Recording_createdById_idx" ON "Recording"("createdById");
CREATE INDEX "Recording_organizationId_updatedAt_idx" ON "Recording"("organizationId", "updatedAt");
CREATE INDEX "Recording_projectId_updatedAt_idx" ON "Recording"("projectId", "updatedAt");
CREATE INDEX "Recording_status_idx" ON "Recording"("status");
CREATE INDEX "Recording_openReplaySessionId_idx" ON "Recording"("openReplaySessionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "OpenReplaySession_sessionId_key" ON "OpenReplaySession"("sessionId");

-- CreateIndex
CREATE INDEX "OpenReplaySession_sessionId_idx" ON "OpenReplaySession"("sessionId");

-- CreateIndex
CREATE INDEX "OpenReplaySession_projectKey_idx" ON "OpenReplaySession"("projectKey");

-- CreateIndex
CREATE INDEX "OpenReplaySession_userUUID_idx" ON "OpenReplaySession"("userUUID");

-- CreateIndex
CREATE INDEX "OpenReplaySession_startTime_idx" ON "OpenReplaySession"("startTime");

-- CreateIndex
CREATE INDEX "OpenReplaySession_isActive_idx" ON "OpenReplaySession"("isActive");

-- CreateIndex
CREATE INDEX "OpenReplayMessage_sessionId_idx" ON "OpenReplayMessage"("sessionId");

-- CreateIndex
CREATE INDEX "OpenReplayMessage_messageType_idx" ON "OpenReplayMessage"("messageType");

-- CreateIndex
CREATE INDEX "OpenReplayMessage_sessionId_timestamp_idx" ON "OpenReplayMessage"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "OpenReplayMessage_sessionId_messageType_idx" ON "OpenReplayMessage"("sessionId", "messageType");
