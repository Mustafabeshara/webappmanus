import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  tenderStatusConfig,
  invoiceStatusConfig,
  priorityConfig,
  TenderStatus,
  InvoiceStatus,
  PriorityLevel,
} from "@/lib/status";

interface StatusBadgeProps {
  status: string;
  type?: "tender" | "invoice" | "priority";
  className?: string;
}

export function StatusBadge({ status, type = "tender", className }: StatusBadgeProps) {
  let config;

  switch (type) {
    case "tender":
      config = tenderStatusConfig[status as TenderStatus];
      break;
    case "invoice":
      config = invoiceStatusConfig[status as InvoiceStatus];
      break;
    case "priority":
      config = priorityConfig[status as PriorityLevel];
      break;
    default:
      config = tenderStatusConfig[status as TenderStatus];
  }

  if (!config) {
    return (
      <Badge variant="outline" className={className}>
        {status}
      </Badge>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        config.bgColor,
        config.darkBgColor,
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}

// Quick status indicators (dots)
interface StatusDotProps {
  status: "success" | "warning" | "error" | "info" | "neutral";
  className?: string;
  pulse?: boolean;
}

export function StatusDot({ status, className, pulse }: StatusDotProps) {
  const colors = {
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    neutral: "bg-gray-400",
  };

  return (
    <span
      className={cn(
        "relative inline-flex h-2 w-2 rounded-full",
        colors[status],
        className
      )}
    >
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            colors[status]
          )}
        />
      )}
    </span>
  );
}
