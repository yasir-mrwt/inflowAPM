import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-danger aria-invalid:ring-danger/30",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-brand-foreground shadow-[0_0_0_1px_color-mix(in_srgb,var(--brand)_22%,transparent)] hover:bg-brand-hover",
        secondary:
          "border-border-strong bg-surface-elevated text-text-primary hover:border-brand-steel/45 hover:bg-surface-hover",
        outline:
          "border-border bg-transparent text-text-secondary hover:border-border-strong hover:bg-surface hover:text-text-primary",
        ghost:
          "bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary",
        destructive:
          "border-danger/25 bg-danger-muted text-danger hover:border-danger/45 hover:bg-danger hover:text-background",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-sm",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
