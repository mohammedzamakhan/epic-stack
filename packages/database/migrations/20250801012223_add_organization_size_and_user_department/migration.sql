-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "size" TEXT;

-- AlterTable
ALTER TABLE "UserOrganization" ADD COLUMN "department" TEXT;

-- CreateTable
CREATE TABLE "OnboardingStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "actionConfig" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "autoDetect" BOOLEAN NOT NULL DEFAULT false,
    "detectConfig" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OnboardingStepProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OnboardingStepProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OnboardingStepProgress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OnboardingStepProgress_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "OnboardingStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OnboardingProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OnboardingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OnboardingProgress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingStep_key_key" ON "OnboardingStep"("key");

-- CreateIndex
CREATE INDEX "OnboardingStep_isActive_sortOrder_idx" ON "OnboardingStep"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "OnboardingStepProgress_userId_organizationId_idx" ON "OnboardingStepProgress"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "OnboardingStepProgress_stepId_idx" ON "OnboardingStepProgress"("stepId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingStepProgress_userId_organizationId_stepId_key" ON "OnboardingStepProgress"("userId", "organizationId", "stepId");

-- CreateIndex
CREATE INDEX "OnboardingProgress_userId_idx" ON "OnboardingProgress"("userId");

-- CreateIndex
CREATE INDEX "OnboardingProgress_organizationId_idx" ON "OnboardingProgress"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProgress_userId_organizationId_key" ON "OnboardingProgress"("userId", "organizationId");
