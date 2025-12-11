CREATE TABLE `cms_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`caseNumber` varchar(100),
	`status` enum('with_cms','discount_requested','awaiting_ctc','awaiting_fatwa','awaiting_audit','contract_issued','closed') NOT NULL DEFAULT 'with_cms',
	`cmsContact` varchar(255),
	`nextFollowupDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cms_cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cms_followups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`note` text,
	`contact` varchar(255),
	`followupDate` timestamp NOT NULL DEFAULT (now()),
	`nextActionDate` timestamp,
	`createdBy` int,
	CONSTRAINT `cms_followups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commission_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ruleId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commission_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commission_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int,
	`amount` int NOT NULL DEFAULT 0,
	`commissionAmount` int NOT NULL DEFAULT 0,
	`userId` int NOT NULL,
	`ruleId` int,
	`status` enum('pending','approved','paid') NOT NULL DEFAULT 'pending',
	`periodStart` date,
	`periodEnd` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commission_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commission_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`scopeType` enum('all','product','category') NOT NULL DEFAULT 'all',
	`productId` int,
	`category` varchar(255),
	`rateBps` int NOT NULL DEFAULT 0,
	`minMarginBps` int DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commission_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `committee_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`role` enum('head_of_department','committee_head','specialty_head','fatwa','ctc','audit') NOT NULL,
	`decision` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`note` text,
	`approverId` int,
	`approverName` varchar(255),
	`decidedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `committee_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`firstName` varchar(255),
	`lastName` varchar(255),
	`title` varchar(255),
	`departmentId` int,
	`managerId` int,
	`hireDate` date,
	`status` enum('active','on_leave','terminated') NOT NULL DEFAULT 'active',
	`email` varchar(320),
	`phone` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leave_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`type` enum('vacation','sick','personal','unpaid') NOT NULL DEFAULT 'vacation',
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reason` text,
	`approverId` int,
	`decidedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leave_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int,
	`name` varchar(255) NOT NULL,
	`amount` int NOT NULL DEFAULT 0,
	`probability` int NOT NULL DEFAULT 50,
	`stage` enum('prospect','proposal','negotiation','verbal','won','lost') NOT NULL DEFAULT 'prospect',
	`expectedCloseDate` date,
	`ownerId` int,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `requirement_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`description` text NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit` varchar(50) NOT NULL DEFAULT 'unit',
	`estimatedUnitPrice` int NOT NULL DEFAULT 0,
	`category` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `requirement_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `requirements_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64),
	`hospital` varchar(255) NOT NULL,
	`specialty` varchar(255) NOT NULL,
	`departmentId` int,
	`fiscalYear` int NOT NULL,
	`totalValue` int NOT NULL DEFAULT 0,
	`approvalGate` enum('committee','fatwa','ctc_audit') NOT NULL DEFAULT 'committee',
	`status` enum('draft','department_review','committee_pending','committee_approved','submitted_to_cms','budget_allocated','tender_posted','award_pending','award_approved','discount_requested','contract_issued','closed','rejected') NOT NULL DEFAULT 'draft',
	`notes` text,
	`submittedAt` timestamp,
	`cmsCaseId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `requirements_requests_id` PRIMARY KEY(`id`)
);
