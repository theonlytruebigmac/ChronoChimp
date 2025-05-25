"use client"

import React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "minimal" | "icon-only";
  className?: string;
}

export function Logo({
  size = "md",
  variant = "default",
  className,
}: LogoProps) {
  // Size mapping
  const sizeClasses = {
    sm: "text-lg gap-1",
    md: "text-xl gap-1.5",
    lg: "text-2xl gap-2",
    xl: "text-3xl gap-2.5",
  };

  const iconSizes = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-7 w-7",
    xl: "h-8 w-8",
  };

  const renderLogo = () => {
    if (variant === "icon-only") {
      return (
        <div className="relative">
          <Clock className={cn("text-primary", iconSizes[size])} />
          <div className="absolute -bottom-1 -right-1 rounded-full bg-secondary w-2.5 h-2.5 border-2 border-background" />
        </div>
      );
    }

    return (
      <>
        <div className="relative">
          <Clock className={cn("text-primary", iconSizes[size])} />
          <div className="absolute -bottom-1 -right-1 rounded-full bg-secondary w-2.5 h-2.5 border-2 border-background" />
        </div>
        {variant === "default" && (
          <span className="font-bold tracking-tight">
            <span className="text-primary">Chrono</span>
            <span className="text-secondary">Chimp</span>
          </span>
        )}
      </>
    );
  };

  return (
    <div
      className={cn(
        "flex items-center",
        sizeClasses[size],
        className
      )}
    >
      {renderLogo()}
    </div>
  );
}
