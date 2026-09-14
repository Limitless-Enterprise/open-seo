CREATE TABLE `research_search_history` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`feature` text NOT NULL,
	`payload_json` text NOT NULL,
	`dedup_key` text NOT NULL,
	`searched_by_user_id` text NOT NULL,
	`searched_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`searched_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_search_history_project_feature_dedup_idx` ON `research_search_history` (`project_id`,`feature`,`dedup_key`);--> statement-breakpoint
CREATE INDEX `research_search_history_project_feature_searched_at_idx` ON `research_search_history` (`project_id`,`feature`,`searched_at`);
