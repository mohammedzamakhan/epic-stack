ALTER TABLE `Organization` ADD `shopPaymentProvider` text DEFAULT 'stripe' NOT NULL;--> statement-breakpoint
ALTER TABLE `Organization` ADD `polarProductId` text;