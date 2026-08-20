CREATE TABLE `StorageMigration` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`sourceType` text NOT NULL,
	`sourceEndpoint` text,
	`sourceBucketName` text,
	`sourceAccessKeyId` text,
	`sourceSecretAccessKey` text,
	`sourceRegion` text,
	`destType` text NOT NULL,
	`destEndpoint` text,
	`destBucketName` text,
	`destAccessKeyId` text,
	`destSecretAccessKey` text,
	`destRegion` text,
	`totalObjects` integer DEFAULT 0 NOT NULL,
	`processedObjects` integer DEFAULT 0 NOT NULL,
	`failedObjects` integer DEFAULT 0 NOT NULL,
	`cursor` integer DEFAULT 0 NOT NULL,
	`workflowInstanceId` text,
	`lastError` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`completedAt` integer,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `StorageMigration_organizationId_status_idx` ON `StorageMigration` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `StorageMigration_organizationId_idx` ON `StorageMigration` (`organizationId`);--> statement-breakpoint
ALTER TABLE `OrganizationS3Config` ADD `previousEndpoint` text;--> statement-breakpoint
ALTER TABLE `OrganizationS3Config` ADD `previousBucketName` text;--> statement-breakpoint
ALTER TABLE `OrganizationS3Config` ADD `previousAccessKeyId` text;--> statement-breakpoint
ALTER TABLE `OrganizationS3Config` ADD `previousSecretAccessKey` text;--> statement-breakpoint
ALTER TABLE `OrganizationS3Config` ADD `previousRegion` text;--> statement-breakpoint
UPDATE "OrganizationNoteUpload" SET "status" = 'completed' WHERE "status" = 'processing';