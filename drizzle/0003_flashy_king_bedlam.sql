CREATE TABLE `goods_receipt_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receiptId` int NOT NULL,
	`poItemId` int NOT NULL,
	`quantityReceived` int NOT NULL,
	`batchNumber` varchar(100),
	`expiryDate` timestamp,
	`condition` enum('good','damaged','defective') NOT NULL DEFAULT 'good',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `goods_receipt_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `goods_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poId` int NOT NULL,
	`receiptNumber` varchar(100) NOT NULL,
	`receiptDate` timestamp NOT NULL DEFAULT (now()),
	`receivedBy` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `goods_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `goods_receipts_receiptNumber_unique` UNIQUE(`receiptNumber`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poId` int NOT NULL,
	`productId` int,
	`description` text NOT NULL,
	`quantity` int NOT NULL,
	`receivedQuantity` int NOT NULL DEFAULT 0,
	`unitPrice` int NOT NULL,
	`totalPrice` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poNumber` varchar(100) NOT NULL,
	`supplierId` int NOT NULL,
	`tenderId` int,
	`budgetId` int,
	`issueDate` timestamp NOT NULL DEFAULT (now()),
	`deliveryDate` timestamp,
	`status` enum('draft','submitted','approved','rejected','completed','cancelled') NOT NULL DEFAULT 'draft',
	`approvalLevel` int NOT NULL DEFAULT 0,
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`subtotal` int NOT NULL,
	`taxAmount` int NOT NULL DEFAULT 0,
	`totalAmount` int NOT NULL,
	`paymentTerms` text,
	`deliveryAddress` text,
	`notes` text,
	`receivedStatus` enum('not_received','partially_received','fully_received') NOT NULL DEFAULT 'not_received',
	`receivedDate` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_orders_poNumber_unique` UNIQUE(`poNumber`)
);
