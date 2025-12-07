ALTER TABLE `expenses` MODIFY COLUMN `expenseNumber` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `expenses` MODIFY COLUMN `expenseDate` timestamp;--> statement-breakpoint
ALTER TABLE `expenses` ADD `approvalStatus` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
CREATE INDEX `category_id_idx` ON `budgets` (`categoryId`);--> statement-breakpoint
CREATE INDEX `department_id_idx` ON `budgets` (`departmentId`);--> statement-breakpoint
CREATE INDEX `created_by_idx` ON `budgets` (`createdBy`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `budgets` (`status`);--> statement-breakpoint
CREATE INDEX `fiscal_year_idx` ON `budgets` (`fiscalYear`);--> statement-breakpoint
CREATE INDEX `budget_id_idx` ON `expenses` (`budgetId`);--> statement-breakpoint
CREATE INDEX `department_id_idx` ON `expenses` (`departmentId`);--> statement-breakpoint
CREATE INDEX `created_by_idx` ON `expenses` (`createdBy`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `expenses` (`status`);--> statement-breakpoint
CREATE INDEX `expense_date_idx` ON `expenses` (`expenseDate`);--> statement-breakpoint
CREATE INDEX `category_id_idx` ON `expenses` (`categoryId`);--> statement-breakpoint
ALTER TABLE `expenses` DROP COLUMN `approvalLevel`;