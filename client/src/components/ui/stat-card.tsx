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
        "relative overflow-hidden transition-all duration-150 border-l-[3px]",
        colors.border,
        onClick && "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tighter tabular-nums">{value}</p>
              {trend && (
                <span className={cn("flex items-center gap-0.5 text-[11px] font-semibold", getTrendColor())}>
                  {getTrendIcon()}
                  {Math.abs(trend.value)}%
                  {trend.label && <span className="text-muted-foreground/70 ml-0.5 font-medium">{trend.label}</span>}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground/70 font-medium">{subtitle}</p>
            )}
            {alert && alert.count > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="inline-flex items-center rounded-md bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50">
                  {alert.count} {alert.label}
                </span>
              </div>
            )}
          </div>
          <div className={cn("p-2.5 rounded-lg shrink-0", colors.bg, "border", colors.border)}>
            <Icon className={cn("h-4 w-4", colors.icon)} strokeWidth={2.5} />
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
