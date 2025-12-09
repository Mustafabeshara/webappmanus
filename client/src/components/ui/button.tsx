import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13px] font-semibold tracking-tight transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[2px] focus-visible:ring-offset-1 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-[#1e3a5f] text-white shadow-sm hover:bg-[#2d5a87] hover:shadow-md active:bg-[#1e3a5f] focus-visible:ring-[#1e3a5f]/50",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md active:bg-red-600 focus-visible:ring-red-500/50",
        outline:
          "border border-border bg-transparent shadow-sm hover:bg-muted/50 hover:border-[#1e3a5f]/40 dark:border-border dark:hover:bg-muted/30 dark:hover:border-[#2d5a87]",
        secondary:
          "bg-muted text-foreground shadow-sm hover:bg-muted/70",
        ghost:
          "hover:bg-muted/50 dark:hover:bg-muted/30",
        link: "text-[#1e3a5f] dark:text-blue-300 underline-offset-4 hover:underline p-0 h-auto",
        accent: "bg-[#f97316] text-white shadow-sm hover:bg-[#ea580c] hover:shadow-md active:bg-[#f97316] focus-visible:ring-[#f97316]/50",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
