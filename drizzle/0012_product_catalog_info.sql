-- Product Catalog Info table for extended product information
CREATE TABLE IF NOT EXISTS `product_catalog_info` (
  `id` int NOT NULL AUTO_INCREMENT,
  `productId` int NOT NULL,
  `productCode` varchar(100),
  `barcode` varchar(100),
  `targetCustomers` text,
  `indication` text,
  `prevalence` varchar(255),
  `marketDemand` enum('low','medium','high','very_high') DEFAULT 'medium',
  `demandNotes` text,
  `competitors` text,
  `competitorPricing` text,
  `marketPosition` varchar(255),
  `uniqueSellingPoints` text,
  `certifications` text,
  `countryOfOrigin` varchar(100),
  `warranty` varchar(255),
  `shelfLife` varchar(100),
  `storageRequirements` text,
  `hsCode` varchar(20),
  `regulatoryStatus` varchar(255),
  `sfdaRegistration` varchar(100),
  `pricingTiers` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_catalog_product` (`productId`),
  KEY `idx_product_catalog_code` (`productCode`),
  KEY `idx_product_catalog_barcode` (`barcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product Competitors table for tracking competitor information
CREATE TABLE IF NOT EXISTS `product_competitors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `productId` int NOT NULL,
  `competitorName` varchar(255) NOT NULL,
  `competitorProduct` varchar(255),
  `competitorPrice` int,
  `competitorStrengths` text,
  `competitorWeaknesses` text,
  `marketShare` varchar(50),
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_competitors_product` (`productId`),
  KEY `idx_product_competitors_name` (`competitorName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
