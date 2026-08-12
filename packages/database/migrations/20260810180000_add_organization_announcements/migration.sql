-- CreateTable
CREATE TABLE "OrganizationAnnouncement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "linkUrl" TEXT,
    "linkLabel" TEXT,
    "linkNewTab" BOOLEAN NOT NULL DEFAULT true,
    "position" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrganizationAnnouncement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "OrganizationAnnouncement_organizationId_idx" ON "OrganizationAnnouncement"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationAnnouncement_organizationId_isEnabled_position_idx" ON "OrganizationAnnouncement"("organizationId", "isEnabled", "position");
