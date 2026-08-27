ALTER TABLE `Organization` ADD `checkoutSubEntityId` text;--> statement-breakpoint
ALTER TABLE `Organization` ADD `checkoutChargesEnabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `Organization` ADD `checkoutPayoutsEnabled` integer DEFAULT false NOT NULL;