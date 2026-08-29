PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_journey_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`journey_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`workflow_instance_id` text,
	`status` text DEFAULT 'running' NOT NULL,
	`current_node_id` text,
	`current_step_node_id` text,
	`trigger_event` text DEFAULT 'phone_verified' NOT NULL,
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
INSERT INTO `__new_journey_runs`("id", "journey_id", "customer_id", "workflow_instance_id", "status", "current_node_id", "current_step_node_id", "trigger_event", "context_data", "error_message", "started_at", "completed_at", "created_at", "updated_at") SELECT "id", "journey_id", "customer_id", "workflow_instance_id", "status", "current_node_id", "current_step_node_id", "trigger_event", "context_data", "error_message", "started_at", "completed_at", "created_at", "updated_at" FROM `journey_runs`;--> statement-breakpoint
DROP TABLE `journey_runs`;--> statement-breakpoint
ALTER TABLE `__new_journey_runs` RENAME TO `journey_runs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_journey_runs_journey_status` ON `journey_runs` (`journey_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_journey_runs_customer` ON `journey_runs` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_journey_runs_status` ON `journey_runs` (`status`);--> statement-breakpoint
CREATE TABLE `__new_marketing_journeys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`trigger_type` text DEFAULT 'phone_verified' NOT NULL,
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
INSERT INTO `__new_marketing_journeys`("id", "name", "description", "status", "trigger_type", "trigger_config", "graph_json", "nodes", "edges", "version", "published_at", "created_at", "updated_at") SELECT "id", "name", "description", "status", "trigger_type", "trigger_config", "graph_json", "nodes", "edges", "version", "published_at", "created_at", "updated_at" FROM `marketing_journeys`;--> statement-breakpoint
DROP TABLE `marketing_journeys`;--> statement-breakpoint
ALTER TABLE `__new_marketing_journeys` RENAME TO `marketing_journeys`;--> statement-breakpoint
CREATE INDEX `idx_marketing_journeys_status` ON `marketing_journeys` (`status`);--> statement-breakpoint
CREATE INDEX `idx_marketing_journeys_trigger_type` ON `marketing_journeys` (`trigger_type`);