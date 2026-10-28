ALTER TABLE `synced_note` ADD `parent_id` text;--> statement-breakpoint
ALTER TABLE `synced_note` ADD `icon` text;--> statement-breakpoint
ALTER TABLE `synced_note` ADD `cover` text;--> statement-breakpoint
ALTER TABLE `synced_note` ADD `cover_y` real DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `synced_note` ADD `position` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `synced_note` ADD `full_width` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `synced_note` ADD `small_text` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `synced_note` ADD `font` text DEFAULT 'sans' NOT NULL;--> statement-breakpoint
ALTER TABLE `synced_note` ADD `locked` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `synced_note` ADD `purged` integer DEFAULT false NOT NULL;