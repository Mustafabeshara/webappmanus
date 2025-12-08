import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon, FileX, Search, Plus, RefreshCw } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = FileX,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-2 mt-2">
          {action && (
            <Button onClick={action.onClick}>
              {action.icon && <action.icon className="h-4 w-4 mr-2" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states for common use cases
export function NoResultsState({
  searchTerm,
  onClear,
}: {
  searchTerm?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={
        searchTerm
          ? `No items match "${searchTerm}". Try adjusting your search.`
          : "No items match your current filters."
      }
      action={
        onClear
          ? { label: "Clear filters", onClick: onClear, icon: RefreshCw }
          : undefined
      }
    />
  );
}

export function NoDataState({
  entityName = "items",
  onAdd,
}: {
  entityName?: string;
  onAdd?: () => void;
}) {
  return (
    <EmptyState
      icon={FileX}
      title={`No ${entityName} yet`}
      description={`Get started by creating your first ${entityName.replace(/s$/, "")}.`}
      action={
        onAdd
          ? {
              label: `Add ${entityName.replace(/s$/, "")}`,
              onClick: onAdd,
              icon: Plus,
            }
          : undefined
      }
    />
  );
}
