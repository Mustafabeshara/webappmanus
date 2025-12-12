-- Foreign keys for Requirements workflow and related entities
-- This migration adds referential integrity with sensible cascade policies
-- requirements_requests -> departments (nullable)
ALTER TABLE `requirements_requests`
ADD CONSTRAINT `fk_requirements_requests_department` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE
SET NULL ON UPDATE CASCADE;
-- requirements_requests -> users (createdBy)
ALTER TABLE `requirements_requests`
ADD CONSTRAINT `fk_requirements_requests_created_by` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE
SET NULL ON UPDATE CASCADE;
-- requirement_items -> requirements_requests
ALTER TABLE `requirement_items`
ADD CONSTRAINT `fk_requirement_items_request` FOREIGN KEY (`requestId`) REFERENCES `requirements_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- committee_approvals -> requirements_requests
ALTER TABLE `committee_approvals`
ADD CONSTRAINT `fk_committee_approvals_request` FOREIGN KEY (`requestId`) REFERENCES `requirements_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- cms_cases -> requirements_requests
ALTER TABLE `cms_cases`
ADD CONSTRAINT `fk_cms_cases_request` FOREIGN KEY (`requestId`) REFERENCES `requirements_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- cms_followups -> requirements_requests
ALTER TABLE `cms_followups`
ADD CONSTRAINT `fk_cms_followups_request` FOREIGN KEY (`requestId`) REFERENCES `requirements_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- Optional reverse link from requirements_requests -> cms_cases (nullable)
ALTER TABLE `requirements_requests`
ADD CONSTRAINT `fk_requirements_requests_cms_case` FOREIGN KEY (`cmsCaseId`) REFERENCES `cms_cases`(`id`) ON DELETE
SET NULL ON UPDATE CASCADE;
