import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  success?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  id,
  label,
  required,
  error,
  success,
  hint,
  className,
  children,
}: FormFieldProps) {
  const hasError = !!error;
  const hasSuccess = !!success;

  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={id}
        className={cn(
          "flex items-center gap-1",
          hasError && "text-destructive"
        )}
      >
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="relative">
        {children}
        {hasError && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive pointer-events-none" />
        )}
        {hasSuccess && !hasError && (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500 pointer-events-none" />
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1.5 animate-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      {success && !error && (
        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {success}
        </p>
      )}
      {hint && !error && !success && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0" />
          {hint}
        </p>
      )}
    </div>
  );
}

// Enhanced Input with validation styling
export interface ValidatedInputProps
  extends React.ComponentProps<typeof Input> {
  error?: boolean;
  success?: boolean;
}

export const ValidatedInput = React.forwardRef<
  HTMLInputElement,
  ValidatedInputProps
>(({ error, success, className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      aria-invalid={error}
      className={cn(
        error && "border-destructive pr-10 focus-visible:ring-destructive/20",
        success && "border-green-500 pr-10 focus-visible:ring-green-500/20",
        className
      )}
      {...props}
    />
  );
});
ValidatedInput.displayName = "ValidatedInput";

// Enhanced Textarea with validation styling
export interface ValidatedTextareaProps
  extends React.ComponentProps<typeof Textarea> {
  error?: boolean;
  success?: boolean;
}

export const ValidatedTextarea = React.forwardRef<
  HTMLTextAreaElement,
  ValidatedTextareaProps
>(({ error, success, className, ...props }, ref) => {
  return (
    <Textarea
      ref={ref}
      aria-invalid={error}
      className={cn(
        error && "border-destructive focus-visible:ring-destructive/20",
        success && "border-green-500 focus-visible:ring-green-500/20",
        className
      )}
      {...props}
    />
  );
});
ValidatedTextarea.displayName = "ValidatedTextarea";

// Form Section for grouping fields
export interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}

export function FormSection({
  title,
  description,
  children,
  className,
  columns = 1,
}: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-sm font-medium text-foreground">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div
        className={cn(
          "grid gap-4",
          columns === 2 && "sm:grid-cols-2",
          columns === 3 && "sm:grid-cols-3"
        )}
      >
        {children}
      </div>
    </div>
  );
}

// Form Actions wrapper
export interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center" | "between";
}

export function FormActions({
  children,
  className,
  align = "left",
}: FormActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-3 pt-4",
        align === "left" && "justify-start",
        align === "right" && "justify-end",
        align === "center" && "justify-center",
        align === "between" && "justify-between",
        className
      )}
    >
      {children}
    </div>
  );
}

// Character counter for textareas
export interface CharacterCounterProps {
  current: number;
  max: number;
  className?: string;
}

export function CharacterCounter({
  current,
  max,
  className,
}: CharacterCounterProps) {
  const isOverLimit = current > max;
  const isNearLimit = current > max * 0.9;

  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        isOverLimit && "text-destructive font-medium",
        isNearLimit && !isOverLimit && "text-amber-600 dark:text-amber-400",
        !isNearLimit && "text-muted-foreground",
        className
      )}
    >
      {current}/{max}
    </span>
  );
}

// Required field indicator
export function RequiredIndicator() {
  return (
    <span className="text-destructive" aria-label="required">
      *
    </span>
  );
}

// Form field group for inline fields
export interface FormFieldGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function FormFieldGroup({ children, className }: FormFieldGroupProps) {
  return (
    <div className={cn("flex gap-3 items-start", className)}>{children}</div>
  );
}
