CREATE TABLE `note_file` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`note_id` text NOT NULL,
	`key` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`content_type` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_note_file_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `note_file_user_note_idx` ON `note_file` (`user_id`,`note_id`);