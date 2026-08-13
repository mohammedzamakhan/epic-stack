-- Landing pages are identified by isHomePage, not slug.
-- Free the "home" slug so it can be used as a normal page URL.
UPDATE "WebsitePage"
SET "slug" = ''
WHERE "isHomePage" = 1
	AND "slug" = 'home'
	AND NOT EXISTS (
		SELECT 1
		FROM "WebsitePage" AS other
		WHERE other."organizationId" = "WebsitePage"."organizationId"
			AND other."id" != "WebsitePage"."id"
			AND other."slug" = ''
	);
