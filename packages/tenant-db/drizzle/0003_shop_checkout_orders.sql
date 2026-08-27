ALTER TABLE `shop_orders` ADD `checkout_session_id` text;--> statement-breakpoint
ALTER TABLE `shop_orders` ADD `checkout_payment_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `shop_orders_checkout_session_id_unique` ON `shop_orders` (`checkout_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `shop_orders_checkout_payment_id_unique` ON `shop_orders` (`checkout_payment_id`);