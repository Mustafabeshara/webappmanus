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

// Stat card color configs
export const statCardColors = {
  blue: {
    icon: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/50",
    border: "border-blue-200 dark:border-blue-800",
  },
  green: {
    icon: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/50",
    border: "border-green-200 dark:border-green-800",
  },
  purple: {
    icon: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/50",
    border: "border-purple-200 dark:border-purple-800",
  },
  orange: {
    icon: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/50",
    border: "border-orange-200 dark:border-orange-800",
  },
  red: {
    icon: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/50",
    border: "border-red-200 dark:border-red-800",
  },
  yellow: {
    icon: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-100 dark:bg-yellow-900/50",
    border: "border-yellow-200 dark:border-yellow-800",
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
 */
export function formatCurrency(cents: number | null | undefined): string {
  if (cents == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * Format large numbers with abbreviations
 */
export function formatCompactNumber(num: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
  }).format(num);
}
