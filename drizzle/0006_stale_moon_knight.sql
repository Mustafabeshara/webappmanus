ALTER TABLE `files` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `files` ADD `parentFileId` int;--> statement-breakpoint
ALTER TABLE `files` ADD `isCurrent` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `files` ADD `replacedAt` timestamp;--> statement-breakpoint
ALTER TABLE `files` ADD `uploadedAt` timestamp DEFAULT (now()) NOT NULL;