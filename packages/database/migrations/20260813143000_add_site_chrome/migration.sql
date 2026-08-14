-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "siteHeaderConfig" TEXT;
ALTER TABLE "Organization" ADD COLUMN "siteFooterConfig" TEXT;

-- Backfill site chrome from the home page when present, otherwise any page.
UPDATE "Organization"
SET "siteHeaderConfig" = (
	SELECT s."config"
	FROM "WebsitePageSection" s
	INNER JOIN "WebsitePage" p ON p."id" = s."pageId"
	WHERE p."organizationId" = "Organization"."id"
		AND s."type" = 'header'
	ORDER BY p."isHomePage" DESC, p."position" ASC, s."createdAt" ASC
	LIMIT 1
)
WHERE "siteHeaderConfig" IS NULL;

UPDATE "Organization"
SET "siteFooterConfig" = (
	SELECT s."config"
	FROM "WebsitePageSection" s
	INNER JOIN "WebsitePage" p ON p."id" = s."pageId"
	WHERE p."organizationId" = "Organization"."id"
		AND s."type" = 'footer'
	ORDER BY p."isHomePage" DESC, p."position" ASC, s."createdAt" ASC
	LIMIT 1
)
WHERE "siteFooterConfig" IS NULL;

-- Header and footer are site-wide now; drop per-page copies.
DELETE FROM "WebsitePageSection" WHERE "type" IN ('header', 'footer');
