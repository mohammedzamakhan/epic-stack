-- CreateTable
CREATE TABLE "UtmSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "term" TEXT,
    "content" TEXT,
    "referrer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "UtmSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrganizationNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "OrganizationNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrganizationNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrganizationNoteImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "altText" TEXT,
    "objectKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "noteId" TEXT NOT NULL,
    CONSTRAINT "OrganizationNoteImage_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "OrganizationNote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UtmSource_userId_key" ON "UtmSource"("userId");

-- CreateIndex
CREATE INDEX "OrganizationNote_organizationId_idx" ON "OrganizationNote"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationNote_createdById_idx" ON "OrganizationNote"("createdById");

-- CreateIndex
CREATE INDEX "OrganizationNote_organizationId_updatedAt_idx" ON "OrganizationNote"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "OrganizationNoteImage_noteId_idx" ON "OrganizationNoteImage"("noteId");
