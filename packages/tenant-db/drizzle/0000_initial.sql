CREATE TABLE `customers` (
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
CREATE UNIQUE INDEX `customers_phone_unique` ON `customers` (`phone`);--> statement-breakpoint
CREATE TABLE `marketing_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`channel` text DEFAULT 'email' NOT NULL,
	`subject` text,
	`content` text DEFAULT '' NOT NULL,
	`target_audience_count` integer DEFAULT 0,
	`segmentation_rules` text DEFAULT '{"audience": "all"}',
	`scheduled_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `marketing_journeys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`trigger_type` text DEFAULT 'customer_signup' NOT NULL,
	`trigger_config` text DEFAULT '{}' NOT NULL,
	`graph_json` text DEFAULT '{"nodes":[],"edges":[]}' NOT NULL,
	`nodes` text DEFAULT '[]' NOT NULL,
	`edges` text DEFAULT '[]' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX `idx_marketing_journeys_status` ON `marketing_journeys` (`status`);--> statement-breakpoint
CREATE INDEX `idx_marketing_journeys_trigger_type` ON `marketing_journeys` (`trigger_type`);--> statement-breakpoint
CREATE TABLE `journey_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`journey_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`workflow_instance_id` text,
	`status` text DEFAULT 'running' NOT NULL,
	`current_node_id` text,
	`current_step_node_id` text,
	`trigger_event` text DEFAULT 'customer_signup' NOT NULL,
	`context_data` text DEFAULT '{}',
	`error_message` text,
	`started_at` integer DEFAULT (strftime('%s', 'now')),
	`completed_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`journey_id`) REFERENCES `marketing_journeys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_journey_runs_journey_status` ON `journey_runs` (`journey_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_journey_runs_customer` ON `journey_runs` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_journey_runs_status` ON `journey_runs` (`status`);--> statement-breakpoint
CREATE TABLE `journey_step_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`journey_id` text,
	`customer_id` text,
	`node_id` text NOT NULL,
	`node_type` text DEFAULT 'trigger' NOT NULL,
	`step_type` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`metadata` text DEFAULT '{}',
	`execution_details` text DEFAULT '{}',
	`error_message` text,
	`executed_at` integer DEFAULT (strftime('%s', 'now')),
	`completed_at` integer,
	FOREIGN KEY (`run_id`) REFERENCES `journey_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`journey_id`) REFERENCES `marketing_journeys`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_journey_step_executions_run` ON `journey_step_executions` (`run_id`,`node_id`);--> statement-breakpoint
CREATE INDEX `idx_journey_step_executions_customer` ON `journey_step_executions` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_journey_step_executions_status` ON `journey_step_executions` (`status`);--> statement-breakpoint
CREATE TABLE `marketing_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text,
	`journey_step_execution_id` text,
	`customer_id` text NOT NULL,
	`channel` text DEFAULT 'email' NOT NULL,
	`status` text DEFAULT 'Sent' NOT NULL,
	`sent_at` integer DEFAULT (strftime('%s', 'now')),
	`opened_at` integer,
	`clicked_at` integer,
	FOREIGN KEY (`campaign_id`) REFERENCES `marketing_campaigns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`journey_step_execution_id`) REFERENCES `journey_step_executions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
