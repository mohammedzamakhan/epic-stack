ALTER TABLE `OrganizationS3Config` ADD COLUMN `previousEndpoint` text;
--> statement-breakpoint
ALTER TABLE `OrganizationS3Config` ADD COLUMN `previousBucketName` text;
--> statement-breakpoint
ALTER TABLE `OrganizationS3Config` ADD COLUMN `previousAccessKeyId` text;
--> statement-breakpoint
ALTER TABLE `OrganizationS3Config` ADD COLUMN `previousSecretAccessKey` text;
--> statement-breakpoint
ALTER TABLE `OrganizationS3Config` ADD COLUMN `previousRegion` text;
