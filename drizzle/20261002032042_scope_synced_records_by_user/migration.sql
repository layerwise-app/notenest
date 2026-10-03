PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_synced_folder` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `synced_folder_pk` PRIMARY KEY(`user_id`, `id`),
	CONSTRAINT `fk_synced_folder_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_synced_folder`(`id`, `user_id`, `name`, `created_at`, `updated_at`, `deleted_at`) SELECT `id`, `user_id`, `name`, `created_at`, `updated_at`, `deleted_at` FROM `synced_folder`;--> statement-breakpoint
DROP TABLE `synced_folder`;--> statement-breakpoint
ALTER TABLE `__new_synced_folder` RENAME TO `synced_folder`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_synced_note` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`folder_id` text,
	`pinned` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `synced_note_pk` PRIMARY KEY(`user_id`, `id`),
	CONSTRAINT `fk_synced_note_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_synced_note`(`id`, `user_id`, `title`, `content`, `folder_id`, `pinned`, `created_at`, `updated_at`, `deleted_at`) SELECT `id`, `user_id`, `title`, `content`, `folder_id`, `pinned`, `created_at`, `updated_at`, `deleted_at` FROM `synced_note`;--> statement-breakpoint
DROP TABLE `synced_note`;--> statement-breakpoint
ALTER TABLE `__new_synced_note` RENAME TO `synced_note`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `synced_folder_user_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `synced_note_user_id_idx`;