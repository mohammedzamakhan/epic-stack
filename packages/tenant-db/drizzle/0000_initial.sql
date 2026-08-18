CREATE TABLE IF NOT EXISTS `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`phone_verified` integer DEFAULT false,
	`phone_verification_code` text,
	`phone_verification_expires_at` integer,
	`refresh_token_hash` text,
	`refresh_token_expires_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `customers_phone_unique` ON `customers` (`phone`);