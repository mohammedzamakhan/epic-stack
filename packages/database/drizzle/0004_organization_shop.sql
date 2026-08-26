ALTER TABLE `Organization` ADD `stripeConnectAccountId` text;--> statement-breakpoint
ALTER TABLE `Organization` ADD `stripeConnectChargesEnabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `Organization` ADD `stripeConnectPayoutsEnabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `Organization` ADD `shopProductName` text;--> statement-breakpoint
ALTER TABLE `Organization` ADD `shopProductDescription` text;--> statement-breakpoint
ALTER TABLE `Organization` ADD `shopProductPriceCents` integer;--> statement-breakpoint
ALTER TABLE `Organization` ADD `shopEnabled` integer DEFAULT false NOT NULL;
