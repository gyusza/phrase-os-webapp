CREATE TABLE `analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`recording_id` text NOT NULL,
	`items` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`full_name` text,
	`avatar_url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`settings` text DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE `progress_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`recordings_count` integer DEFAULT 0,
	`vocabulary_added` integer DEFAULT 0,
	`vocabulary_reviewed` integer DEFAULT 0,
	`total_study_time` integer DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recordings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`audio_url` text NOT NULL,
	`duration` integer NOT NULL,
	`transcription` text,
	`language` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`metadata` text DEFAULT '{}',
	`status` text DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`daily_vocabulary_goal` integer,
	`notification_preferences` text DEFAULT '{}',
	`theme` text DEFAULT 'light',
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`source_languages` text DEFAULT '["en"]',
	`target_language` text DEFAULT 'da'
);
--> statement-breakpoint
CREATE TABLE `vocabulary` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`word` text NOT NULL,
	`translation` text NOT NULL,
	`language` text NOT NULL,
	`context` text,
	`example_sentence` text,
	`difficulty_level` integer,
	`last_reviewed` text,
	`next_review` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`metadata` text DEFAULT '{}',
	`target_language` text DEFAULT 'da' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vocabulary_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`vocabulary_id` text NOT NULL,
	`review_date` text NOT NULL,
	`success` integer NOT NULL,
	`difficulty_rating` integer,
	`notes` text,
	`created_at` text NOT NULL
);
