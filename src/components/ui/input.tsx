import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        outline: "border-2",
        ghost: "border-none bg-transparent focus-visible:bg-accent/5",
        filled: "bg-muted border-transparent",
        underlined: "rounded-none border-t-0 border-l-0 border-r-0 border-b-2 px-0 focus-visible:ring-0",
        glass: "bg-white/10 backdrop-blur-md border-white/20 focus-visible:border-white/30",
      },
      size: {
        default: "h-10",
        sm: "h-8 px-2 py-1 text-xs",
        lg: "h-12 px-4 py-3 text-base",
        icon: "h-10 w-10 p-0",
      },
      isError: {
        true: "border-destructive focus-visible:ring-destructive",
        false: "",
      },
      isSuccess: {
        true: "border-success focus-visible:ring-success",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      isError: false,
      isSuccess: false,
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  isLoading?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, size, isError, isSuccess, leftIcon, rightIcon, isLoading, ...props }, ref) => {
    // Ensure size is handled correctly for the variant props
    const variantSize = size as VariantProps<typeof inputVariants>['size'];
    
    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            inputVariants({ variant, size: variantSize, isError, isSuccess }),
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            className
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && !isLoading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
            {rightIcon}
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <div className="loading-dots">
              <div></div>
              <div></div>
              <div></div>
            </div>
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

export { Input, inputVariants }
