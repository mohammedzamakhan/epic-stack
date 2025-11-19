-- CreateTable
CREATE TABLE "SSOConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "issuerUrl" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "authorizationUrl" TEXT,
    "tokenUrl" TEXT,
    "userinfoUrl" TEXT,
    "revocationUrl" TEXT,
    "scopes" TEXT NOT NULL DEFAULT 'openid email profile',
    "autoDiscovery" BOOLEAN NOT NULL DEFAULT true,
    "pkceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoProvision" BOOLEAN NOT NULL DEFAULT true,
    "defaultRole" TEXT NOT NULL DEFAULT 'member',
    "attributeMapping" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastTested" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "SSOConfiguration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SSOConfiguration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SSOSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "ssoConfigId" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SSOSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SSOSession_ssoConfigId_fkey" FOREIGN KEY ("ssoConfigId") REFERENCES "SSOConfiguration" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SSOConfiguration_organizationId_key" ON "SSOConfiguration"("organizationId");

-- CreateIndex
CREATE INDEX "SSOConfiguration_organizationId_idx" ON "SSOConfiguration"("organizationId");

-- CreateIndex
CREATE INDEX "SSOConfiguration_isEnabled_idx" ON "SSOConfiguration"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "SSOSession_sessionId_key" ON "SSOSession"("sessionId");

-- CreateIndex
CREATE INDEX "SSOSession_ssoConfigId_idx" ON "SSOSession"("ssoConfigId");

-- CreateIndex
CREATE INDEX "SSOSession_providerUserId_idx" ON "SSOSession"("providerUserId");
