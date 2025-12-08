import { toast } from "sonner";

// Notification type from database schema
type NotificationType = 
  | "approval_request"
  | "approval_granted"
  | "approval_denied"
  | "task_assigned"
  | "task_updated"
  | "alert"
  | "warning"
  | "info"
  | "success"
  | "error"
  | "system";

type EntityType = 
  | "expenses"
  | "tasks"
  | "budgets"
  | "purchase_orders"
  | "inventory"
  | "deliveries"
  | "tenders"
  | "invoices"
  | "system";

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: EntityType | null;
  entityId?: number | null;
}

// Map notification types to toast variants and icons
const notificationConfig: Record<NotificationType, { variant: "default" | "success" | "error" | "warning" | "info"; icon: string }> = {
  approval_request: { variant: "info", icon: "⏳" },
  approval_granted: { variant: "success", icon: "✅" },
  approval_denied: { variant: "error", icon: "❌" },
  task_assigned: { variant: "info", icon: "📋" },
  task_updated: { variant: "info", icon: "🔄" },
  alert: { variant: "warning", icon: "⚠️" },
  warning: { variant: "warning", icon: "⚠️" },
  info: { variant: "info", icon: "ℹ️" },
  success: { variant: "success", icon: "✅" },
  error: { variant: "error", icon: "❌" },
  system: { variant: "default", icon: "🔔" },
};

// Map entity types to URLs
const entityUrls: Record<EntityType, (id: number) => string> = {
  expenses: (id) => `/expenses/${id}`,
  tasks: (id) => `/tasks/${id}`,
  budgets: (id) => `/budgets/${id}`,
  purchase_orders: (id) => `/purchase-orders/${id}`,
  inventory: (id) => `/inventory/${id}`,
  deliveries: (id) => `/deliveries/${id}`,
  tenders: (id) => `/tenders/${id}`,
  invoices: (id) => `/invoices/${id}`,
  system: () => "/dashboard",
};

/**
 * Show a toast notification for a given notification object
 */
export function showNotificationToast(notification: Notification) {
  const config = notificationConfig[notification.type] || notificationConfig.info;
  
  // Build the toast message
  const message = `${config.icon} ${notification.title}`;
  const description = notification.message;
  
  // Show toast based on variant
  switch (config.variant) {
    case "success":
      toast.success(message, {
        description,
        duration: 5000,
        action: notification.entityType && notification.entityId ? {
          label: "View",
          onClick: () => {
            const url = entityUrls[notification.entityType!](notification.entityId!);
            window.location.href = url;
          },
        } : undefined,
      });
      break;
    case "error":
      toast.error(message, {
        description,
        duration: 5000,
        action: notification.entityType && notification.entityId ? {
          label: "View",
          onClick: () => {
            const url = entityUrls[notification.entityType!](notification.entityId!);
            window.location.href = url;
          },
        } : undefined,
      });
      break;
    case "warning":
      toast.warning(message, {
        description,
        duration: 5000,
        action: notification.entityType && notification.entityId ? {
          label: "View",
          onClick: () => {
            const url = entityUrls[notification.entityType!](notification.entityId!);
            window.location.href = url;
          },
        } : undefined,
      });
      break;
    case "info":
      toast.info(message, {
        description,
        duration: 5000,
        action: notification.entityType && notification.entityId ? {
          label: "View",
          onClick: () => {
            const url = entityUrls[notification.entityType!](notification.entityId!);
            window.location.href = url;
          },
        } : undefined,
      });
      break;
    default:
      toast(message, {
        description,
        duration: 5000,
        action: notification.entityType && notification.entityId ? {
          label: "View",
          onClick: () => {
            const url = entityUrls[notification.entityType!](notification.entityId!);
            window.location.href = url;
          },
        } : undefined,
      });
  }
}
