import * as React from 'react';
import { cva, type VariantProps } from "class-variance-authority"

import {cn} from '@/lib/utils';

const textareaVariants = cva(
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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
      isError: false,
      isSuccess: false,
    },
  }
)

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  isResizable?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({className, variant, isError, isSuccess, isResizable = true, ...props}, ref) => {
    return (
      <textarea
        className={cn(
          textareaVariants({ variant, isError, isSuccess }),
          !isResizable && "resize-none",
          isResizable && "resize-y",
          "min-h-[80px]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea, textareaVariants};
