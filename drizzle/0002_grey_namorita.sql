ALTER TABLE `participant_bid_items` ADD `isCompliant` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `participant_bid_items` ADD `complianceIssues` text;--> statement-breakpoint
ALTER TABLE `participant_bid_items` ADD `priceCompliant` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `participant_bid_items` ADD `deadlineCompliant` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `participant_bid_items` ADD `documentsCompliant` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `participant_bid_items` ADD `specsCompliant` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `participant_bid_items` ADD `supplierCompliant` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `participant_bid_items` ADD `quantityCompliant` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `participant_bid_items` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;