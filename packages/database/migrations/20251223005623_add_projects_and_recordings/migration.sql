-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT 'gray',
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recording" (
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
    CONSTRAINT "Recording_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectFavorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectFavorite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecordingFavorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecordingFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecordingFavorite_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecordingAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecordingAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecordingAccess_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecordingComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecordingComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RecordingComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecordingComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecordingComment_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecordingCommentImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "altText" TEXT,
    "objectKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "commentId" TEXT NOT NULL,
    CONSTRAINT "RecordingCommentImage_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "RecordingComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" TEXT,
    "targetUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectActivityLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectActivityLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecordingActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" TEXT,
    "targetUserId" TEXT,
    "integrationId" TEXT,
    "commentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecordingActivityLog_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecordingActivityLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecordingActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecordingActivityLog_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectIntegrationConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastPostedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectIntegrationConnection_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectIntegrationConnection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecordingIntegrationConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordingId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastPostedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecordingIntegrationConnection_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecordingIntegrationConnection_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- CreateIndex
CREATE INDEX "Project_createdById_idx" ON "Project"("createdById");

-- CreateIndex
CREATE INDEX "Project_organizationId_updatedAt_idx" ON "Project"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "Recording_projectId_idx" ON "Recording"("projectId");

-- CreateIndex
CREATE INDEX "Recording_organizationId_idx" ON "Recording"("organizationId");

-- CreateIndex
CREATE INDEX "Recording_createdById_idx" ON "Recording"("createdById");

-- CreateIndex
CREATE INDEX "Recording_organizationId_updatedAt_idx" ON "Recording"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "Recording_projectId_updatedAt_idx" ON "Recording"("projectId", "updatedAt");

-- CreateIndex
CREATE INDEX "Recording_status_idx" ON "Recording"("status");

-- CreateIndex
CREATE INDEX "ProjectFavorite_userId_idx" ON "ProjectFavorite"("userId");

-- CreateIndex
CREATE INDEX "ProjectFavorite_projectId_idx" ON "ProjectFavorite"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFavorite_userId_projectId_key" ON "ProjectFavorite"("userId", "projectId");

-- CreateIndex
CREATE INDEX "RecordingFavorite_userId_idx" ON "RecordingFavorite"("userId");

-- CreateIndex
CREATE INDEX "RecordingFavorite_recordingId_idx" ON "RecordingFavorite"("recordingId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordingFavorite_userId_recordingId_key" ON "RecordingFavorite"("userId", "recordingId");

-- CreateIndex
CREATE INDEX "RecordingAccess_recordingId_idx" ON "RecordingAccess"("recordingId");

-- CreateIndex
CREATE INDEX "RecordingAccess_userId_idx" ON "RecordingAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordingAccess_recordingId_userId_key" ON "RecordingAccess"("recordingId", "userId");

-- CreateIndex
CREATE INDEX "RecordingComment_recordingId_idx" ON "RecordingComment"("recordingId");

-- CreateIndex
CREATE INDEX "RecordingComment_userId_idx" ON "RecordingComment"("userId");

-- CreateIndex
CREATE INDEX "RecordingComment_parentId_idx" ON "RecordingComment"("parentId");

-- CreateIndex
CREATE INDEX "RecordingComment_recordingId_createdAt_idx" ON "RecordingComment"("recordingId", "createdAt");

-- CreateIndex
CREATE INDEX "RecordingCommentImage_commentId_idx" ON "RecordingCommentImage"("commentId");

-- CreateIndex
CREATE INDEX "ProjectActivityLog_projectId_idx" ON "ProjectActivityLog"("projectId");

-- CreateIndex
CREATE INDEX "ProjectActivityLog_userId_idx" ON "ProjectActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ProjectActivityLog_projectId_createdAt_idx" ON "ProjectActivityLog"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectActivityLog_action_idx" ON "ProjectActivityLog"("action");

-- CreateIndex
CREATE INDEX "RecordingActivityLog_recordingId_idx" ON "RecordingActivityLog"("recordingId");

-- CreateIndex
CREATE INDEX "RecordingActivityLog_userId_idx" ON "RecordingActivityLog"("userId");

-- CreateIndex
CREATE INDEX "RecordingActivityLog_recordingId_createdAt_idx" ON "RecordingActivityLog"("recordingId", "createdAt");

-- CreateIndex
CREATE INDEX "RecordingActivityLog_action_idx" ON "RecordingActivityLog"("action");

-- CreateIndex
CREATE INDEX "ProjectIntegrationConnection_projectId_idx" ON "ProjectIntegrationConnection"("projectId");

-- CreateIndex
CREATE INDEX "ProjectIntegrationConnection_integrationId_idx" ON "ProjectIntegrationConnection"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectIntegrationConnection_projectId_integrationId_externalId_key" ON "ProjectIntegrationConnection"("projectId", "integrationId", "externalId");

-- CreateIndex
CREATE INDEX "RecordingIntegrationConnection_recordingId_idx" ON "RecordingIntegrationConnection"("recordingId");

-- CreateIndex
CREATE INDEX "RecordingIntegrationConnection_integrationId_idx" ON "RecordingIntegrationConnection"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordingIntegrationConnection_recordingId_integrationId_externalId_key" ON "RecordingIntegrationConnection"("recordingId", "integrationId", "externalId");
