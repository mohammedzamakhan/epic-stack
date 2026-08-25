CREATE TABLE `SavedReport` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`organizationId` text,
	`createdById` text NOT NULL,
	`title` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`definition` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `SavedReport_organizationId_updatedAt_idx` ON `SavedReport` (`organizationId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `SavedReport_scope_updatedAt_idx` ON `SavedReport` (`scope`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `SavedReport_createdById_idx` ON `SavedReport` (`createdById`);