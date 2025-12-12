-- Add password authentication columns to users table
ALTER TABLE `users` ADD COLUMN `passwordHash` varchar(255);
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `passwordSalt` varchar(255);
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `failedLoginAttempts` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `lastFailedLoginAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `lockedUntil` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `lastLoginAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `passwordChangedAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `requirePasswordChange` boolean NOT NULL DEFAULT false;
