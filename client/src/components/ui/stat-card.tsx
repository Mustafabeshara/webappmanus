import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { statCardColors, StatCardColor } from "@/lib/status";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: StatCardColor;
  trend?: {
    value: number;
    label?: string;
  };
  alert?: {
    count: number;
    label: string;
  };
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
  trend,
  alert,
  onClick,
  className,
}: StatCardProps) {
  const colors = statCardColors[color];

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="h-3 w-3" />;
    if (trend.value < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.value > 0) return "text-green-600 dark:text-green-400";
    if (trend.value < 0) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0 flex-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
              {trend && (
                <span className={cn("flex items-center gap-0.5 text-xs font-medium", getTrendColor())}>
                  {getTrendIcon()}
                  {Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {alert && alert.count > 0 && (
              <div className="flex items-center gap-1.5 pt-1">
                <span className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-950/50 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {alert.count} {alert.label}
                </span>
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-xl shrink-0", colors.bg)}>
            <Icon className={cn("h-5 w-5", colors.icon)} strokeWidth={2} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatCardGridProps {
  children: React.ReactNode;
  className?: string;
}

export function StatCardGrid({ children, className }: StatCardGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}
