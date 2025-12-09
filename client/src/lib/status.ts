/**
 * Centralized status utilities for consistent styling across the app
 */

export type TenderStatus = "draft" | "open" | "awarded" | "closed" | "archived";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type ExpenseStatus = "pending" | "approved" | "rejected" | "paid";
export type TaskStatus = "todo" | "in_progress" | "completed" | "blocked";
export type PriorityLevel = "low" | "medium" | "high" | "urgent";

export interface StatusConfig {
  label: string;
  className: string;
  icon?: string;
  color: string;
  bgColor: string;
  darkBgColor: string;
}

// Tender statuses
export const tenderStatusConfig: Record<TenderStatus, StatusConfig> = {
  draft: {
    label: "Draft",
    className: "status-badge status-draft",
    color: "text-gray-700 dark:text-gray-300",
    bgColor: "bg-gray-100",
    darkBgColor: "dark:bg-gray-800",
  },
  open: {
    label: "Open",
    className: "status-badge status-open",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100",
    darkBgColor: "dark:bg-blue-900/50",
  },
  awarded: {
    label: "Awarded",
    className: "status-badge status-approved",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100",
    darkBgColor: "dark:bg-green-900/50",
  },
  closed: {
    label: "Closed",
    className: "status-badge status-closed",
    color: "text-gray-700 dark:text-gray-300",
    bgColor: "bg-gray-100",
    darkBgColor: "dark:bg-gray-800",
  },
  archived: {
    label: "Archived",
    className: "status-badge status-closed",
    color: "text-gray-500 dark:text-gray-400",
    bgColor: "bg-gray-50",
    darkBgColor: "dark:bg-gray-900",
  },
};

// Invoice statuses
export const invoiceStatusConfig: Record<InvoiceStatus, StatusConfig> = {
  draft: {
    label: "Draft",
    className: "status-badge status-draft",
    color: "text-gray-700 dark:text-gray-300",
    bgColor: "bg-gray-100",
    darkBgColor: "dark:bg-gray-800",
  },
  sent: {
    label: "Sent",
    className: "status-badge status-open",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100",
    darkBgColor: "dark:bg-blue-900/50",
  },
  paid: {
    label: "Paid",
    className: "status-badge status-paid",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100",
    darkBgColor: "dark:bg-green-900/50",
  },
  overdue: {
    label: "Overdue",
    className: "status-badge status-overdue",
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-100",
    darkBgColor: "dark:bg-red-900/50",
  },
  cancelled: {
    label: "Cancelled",
    className: "status-badge status-closed",
    color: "text-gray-500 dark:text-gray-400",
    bgColor: "bg-gray-100",
    darkBgColor: "dark:bg-gray-800",
  },
};

// Priority levels
export const priorityConfig: Record<PriorityLevel, StatusConfig> = {
  low: {
    label: "Low",
    className: "status-badge",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100",
    darkBgColor: "dark:bg-gray-800",
  },
  medium: {
    label: "Medium",
    className: "status-badge",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100",
    darkBgColor: "dark:bg-blue-900/50",
  },
  high: {
    label: "High",
    className: "status-badge",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100",
    darkBgColor: "dark:bg-orange-900/50",
  },
  urgent: {
    label: "Urgent",
    className: "status-badge",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100",
    darkBgColor: "dark:bg-red-900/50",
  },
};

// Stat card color configs - Corporate Navy + Sunset Orange Theme
export const statCardColors = {
  // Primary navy blue
  navy: {
    icon: "text-[#1e3a5f] dark:text-blue-300",
    bg: "bg-[#1e3a5f]/10 dark:bg-[#1e3a5f]/30",
    border: "border-[#1e3a5f]/20 dark:border-[#1e3a5f]",
  },
  // Standard blue (kept for compatibility)
  blue: {
    icon: "text-[#2d5a87] dark:text-blue-300",
    bg: "bg-[#2d5a87]/10 dark:bg-[#2d5a87]/30",
    border: "border-[#2d5a87]/20 dark:border-[#2d5a87]",
  },
  green: {
    icon: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  purple: {
    icon: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/30",
    border: "border-violet-200 dark:border-violet-800",
  },
  // Sunset orange - accent color
  orange: {
    icon: "text-orange-500 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/30",
    border: "border-orange-200 dark:border-orange-700",
  },
  red: {
    icon: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/30",
    border: "border-red-200 dark:border-red-800",
  },
  yellow: {
    icon: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    border: "border-amber-200 dark:border-amber-800",
  },
};

export type StatCardColor = keyof typeof statCardColors;

/**
 * Get status config by type and value
 */
export function getStatusConfig(
  type: "tender" | "invoice" | "priority",
  value: string
): StatusConfig | undefined {
  switch (type) {
    case "tender":
      return tenderStatusConfig[value as TenderStatus];
    case "invoice":
      return invoiceStatusConfig[value as InvoiceStatus];
    case "priority":
      return priorityConfig[value as PriorityLevel];
    default:
      return undefined;
  }
}

/**
 * Format currency values consistently
 * Supports multiple currencies with KWD as default
 */
export function formatCurrency(
  cents: number | null | undefined,
  currencyCode: string = "KWD"
): string {
  if (cents == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * Supported currencies list
 */
export const SUPPORTED_CURRENCIES = [
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KD" },
  { code: "SAR", name: "Saudi Riyal", symbol: "ر.س" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BD" },
  { code: "QAR", name: "Qatari Riyal", symbol: "ر.ق" },
  { code: "OMR", name: "Omani Rial", symbol: "ر.ع" },
] as const;

/**
 * Format large numbers with abbreviations
 */
export function formatCompactNumber(num: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
  }).format(num);
}
