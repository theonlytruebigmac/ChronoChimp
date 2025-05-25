import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  limit?: number;
  spacing?: "sm" | "md" | "lg" | number;
  size?: "sm" | "md" | "lg" | number;
  ring?: boolean;
  ringColor?: string;
  avatars: {
    src?: string;
    alt: string;
    fallback: string;
  }[];
}

export function AvatarGroup({
  className,
  limit = 5,
  spacing = "md",
  size = "md",
  ring = true,
  ringColor,
  avatars,
  ...props
}: AvatarGroupProps) {
  // Calculate actual spacing in pixels
  const spacingMap = {
    sm: -12,
    md: -16,
    lg: -20,
  }
  
  const spacingValue = typeof spacing === "number" 
    ? spacing 
    : spacingMap[spacing];
  
  // Calculate avatar size
  const sizeMap = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }
  
  const sizeClass = typeof size === "string" ? sizeMap[size] : `h-${size} w-${size}`;
  
  // Calculate how many avatars to show and how many are hidden
  const visibleAvatars = avatars.slice(0, limit);
  const remainingCount = Math.max(0, avatars.length - limit);
  
  // Ring styling
  const ringClass = ring 
    ? ringColor 
      ? `ring-2 ring-${ringColor}` 
      : "ring-2 ring-background" 
    : "";
  
  return (
    <div 
      className={cn("flex items-center", className)} 
      style={{ marginRight: Math.abs(spacingValue) }}
      {...props}
    >
      {visibleAvatars.map((avatar, index) => (
        <div 
          key={index} 
          className="relative inline-block"
          style={{ marginLeft: index > 0 ? spacingValue : 0 }}
        >
          <Avatar className={cn(sizeClass, ringClass)}>
            {avatar.src && <AvatarImage src={avatar.src} alt={avatar.alt} />}
            <AvatarFallback>{avatar.fallback}</AvatarFallback>
          </Avatar>
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div 
          className="relative inline-block"
          style={{ marginLeft: spacingValue }}
        >
          <Avatar className={cn(sizeClass, ringClass, "bg-muted")}>
            <AvatarFallback>+{remainingCount}</AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  )
}
