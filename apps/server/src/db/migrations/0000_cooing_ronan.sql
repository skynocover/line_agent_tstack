CREATE TABLE `calendar_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`all_day` integer DEFAULT false,
	`color` text,
	`label` text,
	`location` text,
	`completed` integer DEFAULT false,
	`user_id` text NOT NULL,
	`message_id` text,
	`group_id` text,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_events_message_id_unique` ON `calendar_events` (`message_id`);--> statement-breakpoint
CREATE INDEX `user_events_idx` ON `calendar_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `group_events_idx` ON `calendar_events` (`group_id`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_id` text NOT NULL,
	`user_id` text NOT NULL,
	`file_name` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`group_id` text,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `files_file_id_unique` ON `files` (`file_id`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `files` (`user_id`);--> statement-breakpoint
CREATE INDEX `group_files_idx` ON `files` (`group_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` text NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`message_type` text DEFAULT 'text' NOT NULL,
	`quoted_message_id` text,
	`group_id` text,
	`event_id` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `messages_message_id_unique` ON `messages` (`message_id`);--> statement-breakpoint
CREATE INDEX `user_messages_idx` ON `messages` (`user_id`);--> statement-breakpoint
CREATE INDEX `event_message_idx` ON `messages` (`event_id`);--> statement-breakpoint
CREATE INDEX `quoted_message_idx` ON `messages` (`quoted_message_id`);--> statement-breakpoint
CREATE INDEX `group_messages_idx` ON `messages` (`group_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP
);
