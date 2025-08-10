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
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "lastRequestAt" DATETIME,
    "lastUserAgent" TEXT,
    "suspiciousScore" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "IpAddress_blacklistedById_fkey" FOREIGN KEY ("blacklistedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IpAddressUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "ipAddressId" TEXT NOT NULL,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "IpAddressUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IpAddressUser_ipAddressId_fkey" FOREIGN KEY ("ipAddressId") REFERENCES "IpAddress" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "IpAddress_ip_key" ON "IpAddress"("ip");

-- CreateIndex
CREATE INDEX "IpAddress_ip_idx" ON "IpAddress"("ip");

-- CreateIndex
CREATE INDEX "IpAddress_isBlacklisted_idx" ON "IpAddress"("isBlacklisted");

-- CreateIndex
CREATE INDEX "IpAddress_suspiciousScore_idx" ON "IpAddress"("suspiciousScore");

-- CreateIndex
CREATE INDEX "IpAddressUser_userId_idx" ON "IpAddressUser"("userId");

-- CreateIndex
CREATE INDEX "IpAddressUser_ipAddressId_idx" ON "IpAddressUser"("ipAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "IpAddressUser_userId_ipAddressId_key" ON "IpAddressUser"("userId", "ipAddressId");
