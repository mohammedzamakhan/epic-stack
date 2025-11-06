-- AlterTable
ALTER TABLE "WaitlistEntry" ADD COLUMN "hasEarlyAccess" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WaitlistEntry" ADD COLUMN "grantedAccessAt" DATETIME;
ALTER TABLE "WaitlistEntry" ADD COLUMN "grantedAccessBy" TEXT;

-- CreateIndex
CREATE INDEX "WaitlistEntry_hasEarlyAccess_idx" ON "WaitlistEntry"("hasEarlyAccess");
