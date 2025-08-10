-- CreateTable
CREATE TABLE "IpAddress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ip" TEXT NOT NULL,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "blacklistReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "blacklistedAt" DATETIME,
    "blacklistedById" TEXT,
    CONSTRAINT "IpAddress_blacklistedById_fkey" FOREIGN KEY ("blacklistedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IpRequestLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ipId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "userAgent" TEXT,
    "referer" TEXT,
    "statusCode" INTEGER,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IpRequestLog_ipId_fkey" FOREIGN KEY ("ipId") REFERENCES "IpAddress" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IpRequestLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "IpAddress_ip_key" ON "IpAddress"("ip");

-- CreateIndex
CREATE INDEX "IpAddress_ip_idx" ON "IpAddress"("ip");

-- CreateIndex
CREATE INDEX "IpAddress_isBlacklisted_idx" ON "IpAddress"("isBlacklisted");

-- CreateIndex
CREATE INDEX "IpRequestLog_ipId_idx" ON "IpRequestLog"("ipId");

-- CreateIndex
CREATE INDEX "IpRequestLog_userId_idx" ON "IpRequestLog"("userId");

-- CreateIndex
CREATE INDEX "IpRequestLog_createdAt_idx" ON "IpRequestLog"("createdAt");

-- CreateIndex
CREATE INDEX "IpRequestLog_ipId_createdAt_idx" ON "IpRequestLog"("ipId", "createdAt");
