import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        success:
          "border-transparent bg-success text-success-foreground hover:bg-success/80",
        warning:
          "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
        outline: "text-foreground",
        subtle:
          "border-transparent bg-primary/10 text-primary hover:bg-primary/20",
        "secondary-subtle":
          "border-transparent bg-secondary/10 text-secondary hover:bg-secondary/20",
        "destructive-subtle":
          "border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20",
        "success-subtle":
          "border-transparent bg-success/10 text-success hover:bg-success/20",
        "warning-subtle":
          "border-transparent bg-warning/10 text-warning hover:bg-warning/20",
        glass:
          "border-white/20 bg-white/25 backdrop-blur-md text-foreground hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/15",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
      animation: {
        none: "",
        pulse: "animate-pulse-subtle",
        bounce: "animate-bounce-subtle",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, animation, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size, animation, className }))} {...props} />
  )
}

export { Badge, badgeVariants }
