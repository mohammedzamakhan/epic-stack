-- CreateIndex
-- Add index for grantedAccessBy field to improve query performance
-- Note: SQLite does not enforce this as a foreign key in this migration;
-- application queries treat grantedAccessBy as a User id.
CREATE INDEX "WaitlistEntry_grantedAccessBy_idx" ON "WaitlistEntry"("grantedAccessBy");
