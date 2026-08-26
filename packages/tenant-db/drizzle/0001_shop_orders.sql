CREATE TABLE `shop_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text,
	`product_name` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`platform_fee_cents` integer NOT NULL,
	`org_payout_cents` integer NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`stripe_checkout_session_id` text,
	`stripe_payment_intent_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_shop_orders_customer` ON `shop_orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_shop_orders_status` ON `shop_orders` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `shop_orders_stripe_checkout_session_id_unique` ON `shop_orders` (`stripe_checkout_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `shop_orders_stripe_payment_intent_id_unique` ON `shop_orders` (`stripe_payment_intent_id`);--> statement-breakpoint
CREATE TABLE `customer_payment_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`stripe_payment_method_id` text NOT NULL,
	`brand` text NOT NULL,
	`last4` text NOT NULL,
	`exp_month` integer NOT NULL,
	`exp_year` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_payment_methods_stripe_payment_method_id_unique` ON `customer_payment_methods` (`stripe_payment_method_id`);--> statement-breakpoint
CREATE INDEX `idx_customer_payment_methods_customer` ON `customer_payment_methods` (`customer_id`);--> statement-breakpoint
ALTER TABLE `customers` ADD COLUMN `stripe_customer_id` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_stripe_customer_id_unique` ON `customers` (`stripe_customer_id`);
