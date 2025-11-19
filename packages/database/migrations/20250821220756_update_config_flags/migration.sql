/*
  Warnings:

  - You are about to alter the column `value` on the `ConfigFlag` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ConfigFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "level" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConfigFlag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConfigFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ConfigFlag" ("createdAt", "id", "key", "level", "organizationId", "updatedAt", "userId", "value") SELECT "createdAt", "id", "key", "level", "organizationId", "updatedAt", "userId", "value" FROM "ConfigFlag";
DROP TABLE "ConfigFlag";
ALTER TABLE "new_ConfigFlag" RENAME TO "ConfigFlag";
CREATE INDEX "ConfigFlag_key_idx" ON "ConfigFlag"("key");
CREATE INDEX "ConfigFlag_level_idx" ON "ConfigFlag"("level");
CREATE INDEX "ConfigFlag_organizationId_idx" ON "ConfigFlag"("organizationId");
CREATE INDEX "ConfigFlag_userId_idx" ON "ConfigFlag"("userId");
CREATE UNIQUE INDEX "ConfigFlag_key_level_organizationId_userId_key" ON "ConfigFlag"("key", "level", "organizationId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
