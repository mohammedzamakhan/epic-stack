-- CreateTable
CREATE TABLE "WebsitePage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "template" TEXT NOT NULL DEFAULT 'blank',
    "isHomePage" BOOLEAN NOT NULL DEFAULT false,
    "position" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "WebsitePage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WebsitePage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebsitePageSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "position" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WebsitePageSection_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WebsitePage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WebsitePage_organizationId_idx" ON "WebsitePage"("organizationId");

-- CreateIndex
CREATE INDEX "WebsitePage_organizationId_status_idx" ON "WebsitePage"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WebsitePage_organizationId_slug_key" ON "WebsitePage"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "WebsitePageSection_pageId_idx" ON "WebsitePageSection"("pageId");

-- CreateIndex
CREATE INDEX "WebsitePageSection_pageId_position_idx" ON "WebsitePageSection"("pageId", "position");
