-- CreateTable
CREATE TABLE "MCPAuthorization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MCPAuthorization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MCPAuthorization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MCPAccessToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorizationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MCPAccessToken_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "MCPAuthorization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MCPRefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorizationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MCPRefreshToken_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "MCPAuthorization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WaitlistEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "referralCode" TEXT NOT NULL,
    "hasJoinedDiscord" BOOLEAN NOT NULL DEFAULT false,
    "hasEarlyAccess" BOOLEAN NOT NULL DEFAULT false,
    "grantedAccessAt" DATETIME,
    "grantedAccessBy" TEXT,
    "referredById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WaitlistEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WaitlistEntry_grantedAccessBy_fkey" FOREIGN KEY ("grantedAccessBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WaitlistEntry_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "WaitlistEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WaitlistEntry" ("createdAt", "grantedAccessAt", "grantedAccessBy", "hasEarlyAccess", "hasJoinedDiscord", "id", "points", "referralCode", "referredById", "updatedAt", "userId") SELECT "createdAt", "grantedAccessAt", "grantedAccessBy", "hasEarlyAccess", "hasJoinedDiscord", "id", "points", "referralCode", "referredById", "updatedAt", "userId" FROM "WaitlistEntry";
DROP TABLE "WaitlistEntry";
ALTER TABLE "new_WaitlistEntry" RENAME TO "WaitlistEntry";
CREATE UNIQUE INDEX "WaitlistEntry_userId_key" ON "WaitlistEntry"("userId");
CREATE UNIQUE INDEX "WaitlistEntry_referralCode_key" ON "WaitlistEntry"("referralCode");
CREATE INDEX "WaitlistEntry_userId_idx" ON "WaitlistEntry"("userId");
CREATE INDEX "WaitlistEntry_referralCode_idx" ON "WaitlistEntry"("referralCode");
CREATE INDEX "WaitlistEntry_points_createdAt_idx" ON "WaitlistEntry"("points", "createdAt");
CREATE INDEX "WaitlistEntry_hasEarlyAccess_idx" ON "WaitlistEntry"("hasEarlyAccess");
CREATE INDEX "WaitlistEntry_grantedAccessBy_idx" ON "WaitlistEntry"("grantedAccessBy");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "MCPAuthorization_clientId_key" ON "MCPAuthorization"("clientId");

-- CreateIndex
CREATE INDEX "MCPAuthorization_userId_idx" ON "MCPAuthorization"("userId");

-- CreateIndex
CREATE INDEX "MCPAuthorization_organizationId_idx" ON "MCPAuthorization"("organizationId");

-- CreateIndex
CREATE INDEX "MCPAuthorization_clientId_idx" ON "MCPAuthorization"("clientId");

-- CreateIndex
CREATE INDEX "MCPAuthorization_userId_organizationId_idx" ON "MCPAuthorization"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MCPAccessToken_tokenHash_key" ON "MCPAccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MCPAccessToken_authorizationId_idx" ON "MCPAccessToken"("authorizationId");

-- CreateIndex
CREATE INDEX "MCPAccessToken_tokenHash_idx" ON "MCPAccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MCPAccessToken_expiresAt_idx" ON "MCPAccessToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MCPRefreshToken_tokenHash_key" ON "MCPRefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MCPRefreshToken_authorizationId_idx" ON "MCPRefreshToken"("authorizationId");

-- CreateIndex
CREATE INDEX "MCPRefreshToken_tokenHash_idx" ON "MCPRefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MCPRefreshToken_expiresAt_idx" ON "MCPRefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "MCPRefreshToken_revoked_idx" ON "MCPRefreshToken"("revoked");
