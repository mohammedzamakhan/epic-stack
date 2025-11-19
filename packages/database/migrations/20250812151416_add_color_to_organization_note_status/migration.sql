-- AlterTable
ALTER TABLE "OrganizationNote" ADD COLUMN "priority" TEXT;
ALTER TABLE "OrganizationNote" ADD COLUMN "tags" TEXT;

-- AlterTable
ALTER TABLE "OrganizationNoteStatus" ADD COLUMN "color" TEXT DEFAULT '#6b7280';
