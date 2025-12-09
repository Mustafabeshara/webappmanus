CREATE TABLE IF NOT EXISTS `requirements_requests` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `code` varchar(64),
  `hospital` varchar(255) NOT NULL,
  `specialty` varchar(255) NOT NULL,
  `departmentId` int,
  `fiscalYear` int NOT NULL,
  `totalValue` int NOT NULL DEFAULT 0,
  `approvalGate` enum('committee','fatwa','ctc_audit') NOT NULL DEFAULT 'committee',
  `status` enum('draft','department_review','committee_pending','committee_approved','submitted_to_cms','budget_allocated','tender_posted','award_pending','award_approved','discount_requested','contract_issued','closed','rejected') NOT NULL DEFAULT 'draft',
  `notes` text,
  `submittedAt` timestamp NULL,
  `cmsCaseId` int,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `requirement_items` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `requestId` int NOT NULL,
  `description` text NOT NULL,
  `quantity` int NOT NULL DEFAULT 1,
  `unit` varchar(50) NOT NULL DEFAULT 'unit',
  `estimatedUnitPrice` int NOT NULL DEFAULT 0,
  `category` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `committee_approvals` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `requestId` int NOT NULL,
  `role` enum('head_of_department','committee_head','specialty_head','fatwa','ctc','audit') NOT NULL,
  `decision` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `note` text,
  `approverId` int,
  `approverName` varchar(255),
  `decidedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `cms_cases` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `requestId` int NOT NULL,
  `caseNumber` varchar(100),
  `status` enum('with_cms','discount_requested','awaiting_ctc','awaiting_fatwa','awaiting_audit','contract_issued','closed') NOT NULL DEFAULT 'with_cms',
  `cmsContact` varchar(255),
  `nextFollowupDate` timestamp NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `cms_followups` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `requestId` int NOT NULL,
  `note` text,
  `contact` varchar(255),
  `followupDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `nextActionDate` timestamp NULL,
  `createdBy` int
);

CREATE INDEX `idx_requirement_items_request` ON `requirement_items` (`requestId`);
CREATE INDEX `idx_committee_approvals_request` ON `committee_approvals` (`requestId`);
CREATE INDEX `idx_cms_cases_request` ON `cms_cases` (`requestId`);
CREATE INDEX `idx_cms_followups_request` ON `cms_followups` (`requestId`);
