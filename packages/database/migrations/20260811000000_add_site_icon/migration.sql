-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "siteIconKey" TEXT;

-- CreateTable
CREATE TABLE "OrganizationSiteAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "mimeType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrganizationSiteAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OrganizationSiteAsset_organizationId_idx" ON "OrganizationSiteAsset"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationSiteAsset_organizationId_type_idx" ON "OrganizationSiteAsset"("organizationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSiteAsset_organizationId_type_key" ON "OrganizationSiteAsset"("organizationId", "type");
