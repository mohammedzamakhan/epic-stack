-- CreateTable
CREATE TABLE "RateLimitEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyId" TEXT NOT NULL,
    "keyType" TEXT NOT NULL,
    "keyValue" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "RateLimitEntry_keyId_idx" ON "RateLimitEntry"("keyId");

-- CreateIndex
CREATE INDEX "RateLimitEntry_keyId_createdAt_idx" ON "RateLimitEntry"("keyId", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimitEntry_createdAt_idx" ON "RateLimitEntry"("createdAt");
