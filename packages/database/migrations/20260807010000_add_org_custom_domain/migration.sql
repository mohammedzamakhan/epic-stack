-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "customDomain" TEXT;
ALTER TABLE "Organization" ADD COLUMN "customDomainStatus" TEXT;
ALTER TABLE "Organization" ADD COLUMN "cloudflareHostnameId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_customDomain_key" ON "Organization"("customDomain");
