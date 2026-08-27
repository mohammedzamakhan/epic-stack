ALTER TABLE `shop_orders` ADD `payment_provider` text DEFAULT 'stripe' NOT NULL;--> statement-breakpoint
ALTER TABLE `shop_orders` ADD `polar_checkout_id` text;--> statement-breakpoint
ALTER TABLE `shop_orders` ADD `polar_order_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `shop_orders_polar_checkout_id_unique` ON `shop_orders` (`polar_checkout_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `shop_orders_polar_order_id_unique` ON `shop_orders` (`polar_order_id`);