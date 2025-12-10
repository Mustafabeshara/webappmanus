-- Opportunities for pipeline/forecasting
CREATE TABLE IF NOT EXISTS `opportunities` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `customerId` int,
  `name` varchar(255) NOT NULL,
  `amount` int NOT NULL DEFAULT 0, -- cents
  `probability` int NOT NULL DEFAULT 50, -- percent
  `stage` enum('prospect','proposal','negotiation','verbal','won','lost') NOT NULL DEFAULT 'prospect',
  `expectedCloseDate` date,
  `ownerId` int,
  `status` enum('open','closed') NOT NULL DEFAULT 'open',
  `notes` text,
  `createdBy` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Commission rules and entries
CREATE TABLE IF NOT EXISTS `commission_rules` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `scopeType` enum('all','product','category') NOT NULL DEFAULT 'all',
  `productId` int,
  `category` varchar(255),
  `rateBps` int NOT NULL DEFAULT 0, -- basis points
  `minMarginBps` int DEFAULT 0,
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `commission_assignments` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `ruleId` int NOT NULL,
  `userId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `commission_entries` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `invoiceId` int,
  `amount` int NOT NULL DEFAULT 0, -- invoice amount cents
  `commissionAmount` int NOT NULL DEFAULT 0, -- cents
  `userId` int NOT NULL,
  `ruleId` int,
  `status` enum('pending','approved','paid') NOT NULL DEFAULT 'pending',
  `periodStart` date,
  `periodEnd` date,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- HR: employees and leave requests
CREATE TABLE IF NOT EXISTS `employees` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
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
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `employeeId` int NOT NULL,
  `type` enum('vacation','sick','personal','unpaid') NOT NULL DEFAULT 'vacation',
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reason` text,
  `approverId` int,
  `decidedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

