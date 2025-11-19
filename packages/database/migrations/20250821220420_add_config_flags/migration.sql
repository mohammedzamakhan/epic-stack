-- CreateTable
CREATE TABLE "ConfigFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConfigFlag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConfigFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ConfigFlag_key_idx" ON "ConfigFlag"("key");

-- CreateIndex
CREATE INDEX "ConfigFlag_level_idx" ON "ConfigFlag"("level");

-- CreateIndex
CREATE INDEX "ConfigFlag_organizationId_idx" ON "ConfigFlag"("organizationId");

-- CreateIndex
CREATE INDEX "ConfigFlag_userId_idx" ON "ConfigFlag"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigFlag_key_level_organizationId_userId_key" ON "ConfigFlag"("key", "level", "organizationId", "userId");
