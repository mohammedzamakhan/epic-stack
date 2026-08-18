/*
  Warnings:

  - Made the column `organizationId` on table `Notification` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "WebsitePage" ADD COLUMN "publishedData" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isSeen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Notification" ("createdAt", "entityId", "id", "isRead", "isSeen", "organizationId", "payload", "type", "updatedAt", "userId") SELECT "createdAt", "entityId", "id", "isRead", "isSeen", "organizationId", "payload", "type", "updatedAt", "userId" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE UNIQUE INDEX "Notification_userId_organizationId_type_entityId_key" ON "Notification"("userId", "organizationId", "type", "entityId");
CREATE TABLE "new_Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "hasProvisionedDb" BOOLEAN NOT NULL DEFAULT false,
    "dataRegion" TEXT NOT NULL DEFAULT 'us',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "planName" TEXT,
    "stripeCustomerId" TEXT,
    "stripeProductId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" TEXT,
    "size" TEXT,
    "verifiedDomain" TEXT,
    "sitePublished" BOOLEAN NOT NULL DEFAULT false,
    "customDomain" TEXT,
    "customDomainStatus" TEXT,
    "cloudflareHostnameId" TEXT,
    "siteTheme" TEXT,
    "siteLocales" TEXT,
    "siteDefaultLocale" TEXT DEFAULT 'en',
    "siteIconKey" TEXT,
    "siteHeaderConfig" TEXT,
    "siteFooterConfig" TEXT
);
INSERT INTO "new_Organization" ("active", "cloudflareHostnameId", "createdAt", "customDomain", "customDomainStatus", "description", "id", "name", "planName", "siteDefaultLocale", "siteFooterConfig", "siteHeaderConfig", "siteIconKey", "siteLocales", "sitePublished", "siteTheme", "size", "slug", "stripeCustomerId", "stripeProductId", "stripeSubscriptionId", "subscriptionStatus", "updatedAt", "verifiedDomain") SELECT "active", "cloudflareHostnameId", "createdAt", "customDomain", "customDomainStatus", "description", "id", "name", "planName", "siteDefaultLocale", "siteFooterConfig", "siteHeaderConfig", "siteIconKey", "siteLocales", "sitePublished", "siteTheme", "size", "slug", "stripeCustomerId", "stripeProductId", "stripeSubscriptionId", "subscriptionStatus", "updatedAt", "verifiedDomain" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Organization_customDomain_key" ON "Organization"("customDomain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
