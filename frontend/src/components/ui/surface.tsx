import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const surfaceVariants = cva("border", {
  variants: {
    tone: {
      default: "border-border-subtle bg-surface",
      elevated: "border-border bg-surface-elevated",
      inset: "border-border-subtle bg-surface-inset",
    },
    radius: {
      md: "rounded-md",
      lg: "rounded-lg",
      none: "rounded-none",
    },
    padding: {
      none: "p-0",
      sm: "p-4",
      md: "p-5 sm:p-6",
      lg: "p-6 sm:p-8",
    },
  },
  defaultVariants: {
    tone: "default",
    radius: "lg",
    padding: "md",
  },
});

type SurfaceProps = ComponentProps<"div"> &
  VariantProps<typeof surfaceVariants>;

function Surface({
  className,
  tone,
  radius,
  padding,
  ...props
}: SurfaceProps) {
  return (
    <div
      data-slot="surface"
      className={cn(surfaceVariants({ tone, radius, padding }), className)}
      {...props}
    />
  );
}

export { Surface, surfaceVariants };
