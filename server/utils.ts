import crypto from 'crypto';

// Generate random alphanumeric string (replacement for nanoid to avoid crypto global issues)
function generateRandomId(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Generate unique reference numbers for various entities
 */

export function generateTenderReference(): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const random = generateRandomId(6);
  return `TND-${year}${month}-${random}`;
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const random = generateRandomId(6);
  return `INV-${year}${month}-${random}`;
}

export function generateExpenseNumber(): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const random = generateRandomId(6);
  return `EXP-${year}${month}-${random}`;
}

export function generateDeliveryNumber(): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const random = generateRandomId(6);
  return `DEL-${year}${month}-${random}`;
}

export function generateSupplierCode(): string {
  const random = generateRandomId(8);
  return `SUP-${random}`;
}

export function generateCustomerCode(): string {
  const random = generateRandomId(8);
  return `CUS-${random}`;
}

export function generateProductSKU(): string {
  const random = generateRandomId(10);
  return `SKU-${random}`;
}

export function generateDepartmentCode(name: string): string {
  const prefix = name.substring(0, 3).toUpperCase();
  const random = generateRandomId(4);
  return `${prefix}-${random}`;
}

export function generateBudgetCategoryCode(name: string): string {
  const prefix = name.substring(0, 3).toUpperCase();
  const random = generateRandomId(4);
  return `${prefix}-${random}`;
}

/**
 * Format currency amounts (stored as cents)
 */
export function formatCurrency(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function parseCurrency(amount: string): number {
  return Math.round(parseFloat(amount) * 100);
}

/**
 * Calculate variance percentage
 */
export function calculateVariance(allocated: number, spent: number): number {
  if (allocated === 0) return 0;
  return ((spent - allocated) / allocated) * 100;
}

/**
 * Check if budget is over threshold
 */
export function isBudgetOverThreshold(allocated: number, spent: number, threshold: number = 90): boolean {
  const percentage = (spent / allocated) * 100;
  return percentage >= threshold;
}
