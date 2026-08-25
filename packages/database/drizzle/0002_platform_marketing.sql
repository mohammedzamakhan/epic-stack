CREATE TABLE `PlatformJourneyRun` (
	`id` text PRIMARY KEY NOT NULL,
	`journeyId` text NOT NULL,
	`userId` text NOT NULL,
	`organizationId` text,
	`status` text DEFAULT 'running' NOT NULL,
	`currentNodeId` text,
	`currentStepNodeId` text,
	`triggerEvent` text,
	`contextData` text,
	`errorMessage` text,
	`startedAt` integer NOT NULL,
	`completedAt` integer,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`journeyId`) REFERENCES `PlatformMarketingJourney`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `PlatformJourneyRun_journeyId_status_idx` ON `PlatformJourneyRun` (`journeyId`,`status`);--> statement-breakpoint
CREATE INDEX `PlatformJourneyRun_userId_idx` ON `PlatformJourneyRun` (`userId`);--> statement-breakpoint
CREATE TABLE `PlatformJourneyStepExecution` (
	`id` text PRIMARY KEY NOT NULL,
	`runId` text NOT NULL,
	`nodeId` text NOT NULL,
	`nodeType` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempt` integer DEFAULT 0 NOT NULL,
	`executionDetails` text,
	`errorMessage` text,
	`executedAt` integer,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`runId`) REFERENCES `PlatformJourneyRun`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `PlatformJourneyStepExecution_runId_idx` ON `PlatformJourneyStepExecution` (`runId`);--> statement-breakpoint
CREATE UNIQUE INDEX `PlatformJourneyStepExecution_runId_nodeId_key` ON `PlatformJourneyStepExecution` (`runId`,`nodeId`);--> statement-breakpoint
CREATE TABLE `PlatformMarketingCampaign` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`channel` text NOT NULL,
	`subject` text,
	`content` text NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`audience` text DEFAULT 'all_operators' NOT NULL,
	`targetOrganizationId` text,
	`targetAudienceCount` integer DEFAULT 0 NOT NULL,
	`segmentationRules` text,
	`scheduledAt` integer,
	`createdById` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`targetOrganizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `PlatformMarketingCampaign_status_idx` ON `PlatformMarketingCampaign` (`status`);--> statement-breakpoint
CREATE INDEX `PlatformMarketingCampaign_createdAt_idx` ON `PlatformMarketingCampaign` (`createdAt`);--> statement-breakpoint
CREATE TABLE `PlatformMarketingJourney` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`triggerType` text NOT NULL,
	`triggerConfig` text,
	`nodes` text,
	`edges` text,
	`graphJson` text,
	`version` integer DEFAULT 1 NOT NULL,
	`publishedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `PlatformMarketingJourney_status_idx` ON `PlatformMarketingJourney` (`status`);--> statement-breakpoint
CREATE INDEX `PlatformMarketingJourney_triggerType_idx` ON `PlatformMarketingJourney` (`triggerType`);--> statement-breakpoint
CREATE TABLE `PlatformMarketingMessage` (
	`id` text PRIMARY KEY NOT NULL,
	`campaignId` text NOT NULL,
	`userId` text NOT NULL,
	`status` text DEFAULT 'Processing' NOT NULL,
	`sentAt` integer,
	`openedAt` integer,
	`clickedAt` integer,
	`providerMessageId` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`campaignId`) REFERENCES `PlatformMarketingCampaign`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `PlatformMarketingMessage_campaignId_idx` ON `PlatformMarketingMessage` (`campaignId`);--> statement-breakpoint
CREATE INDEX `PlatformMarketingMessage_userId_idx` ON `PlatformMarketingMessage` (`userId`);--> statement-breakpoint
CREATE INDEX `PlatformMarketingMessage_providerMessageId_idx` ON `PlatformMarketingMessage` (`providerMessageId`);