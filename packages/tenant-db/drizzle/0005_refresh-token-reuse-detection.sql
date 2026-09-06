CREATE TABLE `customer_refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`rotated_at` integer,
	`revoked_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_refresh_tokens_token_hash_unique` ON `customer_refresh_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_customer_refresh_tokens_customer` ON `customer_refresh_tokens` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_marketing_messages_campaign` ON `marketing_messages` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `idx_marketing_messages_customer` ON `marketing_messages` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_marketing_messages_status` ON `marketing_messages` (`status`);--> statement-breakpoint
CREATE INDEX `idx_marketing_messages_sent_at` ON `marketing_messages` (`sent_at`);--> statement-breakpoint
CREATE INDEX `idx_marketing_messages_journey_step` ON `marketing_messages` (`journey_step_execution_id`);