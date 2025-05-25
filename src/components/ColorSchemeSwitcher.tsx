"use client";

import React from "react";
import { useColorScheme, type ColorScheme } from "@/lib/theme-utils";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Paintbrush } from "lucide-react";

const schemeNames: Record<ColorScheme, string> = {
  blue: "Indigo Blue",
  purple: "Royal Purple",
  teal: "Ocean Teal",
  green: "Forest Green",
  amber: "Sunset Amber",
  rose: "Rose Pink",
  slate: "Slate Gray",
};

export function ColorSchemeSwitcher() {
  const { colorScheme, applyColorScheme } = useColorScheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9"
          aria-label="Change color scheme"
        >
          <Paintbrush className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(schemeNames).map(([scheme, name]) => (
          <DropdownMenuItem
            key={scheme}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => applyColorScheme(scheme as ColorScheme)}
          >
            <div 
              className="h-4 w-4 rounded-full" 
              style={{ 
                background: `linear-gradient(45deg, hsl(${scheme === colorScheme ? 'var(--primary)' : scheme}), hsl(${scheme === colorScheme ? 'var(--secondary)' : scheme}))` 
              }} 
            />
            <span>{name}</span>
            {scheme === colorScheme && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Simple color scheme indicator that shows the current color scheme
export function ColorSchemeIndicator() {
  const { colorScheme } = useColorScheme();
  
  return (
    <div className="flex items-center gap-2">
      <div 
        className="h-3 w-3 rounded-full" 
        style={{ 
          background: `linear-gradient(45deg, hsl(var(--primary)), hsl(var(--secondary)))` 
        }} 
      />
      <span className="text-xs text-muted-foreground">
        {schemeNames[colorScheme]}
      </span>
    </div>
  );
}
