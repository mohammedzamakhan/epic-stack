CREATE TABLE `WebsiteNotFoundLog` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`path` text NOT NULL,
	`hitCount` integer DEFAULT 1 NOT NULL,
	`firstHitAt` integer NOT NULL,
	`lastHitAt` integer NOT NULL,
	`lastReferrer` text,
	`lastUserAgent` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `WebsiteNotFoundLog_organizationId_path_key` ON `WebsiteNotFoundLog` (`organizationId`,`path`);--> statement-breakpoint
CREATE INDEX `WebsiteNotFoundLog_organizationId_lastHitAt_idx` ON `WebsiteNotFoundLog` (`organizationId`,`lastHitAt`);--> statement-breakpoint
CREATE INDEX `WebsiteNotFoundLog_organizationId_hitCount_idx` ON `WebsiteNotFoundLog` (`organizationId`,`hitCount`);--> statement-breakpoint
CREATE INDEX `WebsiteNotFoundLog_organizationId_idx` ON `WebsiteNotFoundLog` (`organizationId`);--> statement-breakpoint
CREATE TABLE `WebsiteRedirect` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`fromPath` text NOT NULL,
	`toPath` text NOT NULL,
	`statusCode` integer DEFAULT 301 NOT NULL,
	`isEnabled` integer DEFAULT true NOT NULL,
	`hitCount` integer DEFAULT 0 NOT NULL,
	`lastTriggeredAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `WebsiteRedirect_organizationId_fromPath_key` ON `WebsiteRedirect` (`organizationId`,`fromPath`);--> statement-breakpoint
CREATE INDEX `WebsiteRedirect_organizationId_idx` ON `WebsiteRedirect` (`organizationId`);--> statement-breakpoint
CREATE INDEX `WebsiteRedirect_organizationId_isEnabled_idx` ON `WebsiteRedirect` (`organizationId`,`isEnabled`);