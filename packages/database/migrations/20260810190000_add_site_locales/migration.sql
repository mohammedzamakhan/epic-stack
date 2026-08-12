-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "siteLocales" TEXT;
ALTER TABLE "Organization" ADD COLUMN "siteDefaultLocale" TEXT DEFAULT 'en';

-- Backfill announcement content/linkLabel plain strings into JSON locale maps
UPDATE "OrganizationAnnouncement"
SET "content" = '{"en":' || json_quote("content") || '}'
WHERE "content" IS NOT NULL
  AND trim("content") != ''
  AND substr(trim("content"), 1, 1) != '{';

UPDATE "OrganizationAnnouncement"
SET "linkLabel" = '{"en":' || json_quote("linkLabel") || '}'
WHERE "linkLabel" IS NOT NULL
  AND trim("linkLabel") != ''
  AND substr(trim("linkLabel"), 1, 1) != '{';
