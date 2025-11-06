-- CreateIndex
-- Add index for grantedAccessBy field to improve query performance
-- Note: The foreign key relationship is enforced by Prisma, not at database level for SQLite
CREATE INDEX "WaitlistEntry_grantedAccessBy_idx" ON "WaitlistEntry"("grantedAccessBy");
