import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:ring-[2px] focus-visible:ring-offset-1 transition-colors duration-150 overflow-hidden uppercase",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#1e3a5f] text-white",
        secondary:
          "border-border bg-muted text-foreground/80",
        destructive:
          "border-transparent bg-red-600 text-white",
        outline:
          "border-border text-foreground/70 bg-transparent",
        success:
          "border-transparent bg-emerald-600 text-white",
        warning:
          "border-transparent bg-[#f97316] text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
