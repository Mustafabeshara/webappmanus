CREATE TABLE `widget_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`widgetType` varchar(100) NOT NULL,
	`position` text NOT NULL,
	`settings` text,
	`isVisible` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `widget_preferences_id` PRIMARY KEY(`id`)
);
