import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const skeletonVariants = cva("rounded-md bg-muted", {
  variants: {
    animation: {
      pulse: "animate-pulse",
      shimmer: "animate-[shimmer_2s_infinite]",
      none: "",
    },
    variant: {
      default: "bg-muted",
      subtle: "bg-muted/50",
      dark: "bg-muted-foreground/10",
    },
  },
  defaultVariants: {
    animation: "pulse",
    variant: "default",
  },
});

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

function Skeleton({
  className,
  animation,
  variant,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ animation, variant }), className)}
      {...props}
    />
  );
}

// Common skeleton patterns
function SkeletonText({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn("h-4 w-full", className)} {...props} />;
}

function SkeletonTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn("h-8 w-3/4", className)} {...props} />;
}

function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      <Skeleton className="h-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

function SkeletonAvatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn("h-12 w-12 rounded-full", className)} {...props} />;
}

function SkeletonButton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn("h-10 w-24 rounded-md", className)} {...props} />;
}

function SkeletonBadge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn("h-5 w-16 rounded-full", className)} {...props} />;
}

export { 
  Skeleton, 
  SkeletonText, 
  SkeletonTitle, 
  SkeletonCard, 
  SkeletonAvatar, 
  SkeletonButton,
  SkeletonBadge,
  skeletonVariants 
}
