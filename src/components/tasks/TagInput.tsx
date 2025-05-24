"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TagData {
  text: string;
  color?: string;
}

interface TagInputProps {
  tags: TagData[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onAddTag: (tag: TagData) => void;
  onRemoveTag: (index: number) => void;
  onUpdateTagColor: (index: number, color: string) => void;
  placeholder?: string;
  className?: string;
}

const predefinedColors = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
];

export function TagInput({
  tags,
  inputValue,
  onInputChange,
  onAddTag,
  onRemoveTag,
  onUpdateTagColor,
  placeholder = "Add tag...",
  className,
}: TagInputProps) {
  const [colorPickerIndex, setColorPickerIndex] = useState<number | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleAddTag = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue) {
      onAddTag({ text: trimmedValue });
    }
  };

  const handleColorSelect = (index: number, color: string) => {
    onUpdateTagColor(index, color);
    setColorPickerIndex(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2 p-2 border border-input rounded-md min-h-[40px] bg-background">
        {tags.map((tag, index) => (
          <div key={index} className="relative">
            <Badge
              variant="secondary"
              className="flex items-center gap-1 text-sm py-1 px-2 pr-6 capitalize"
              style={tag.color ? { backgroundColor: tag.color, color: 'white' } : undefined}
            >
              {tag.text}
              <div className="flex items-center gap-1 ml-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => setColorPickerIndex(colorPickerIndex === index ? null : index)}
                >
                  <Palette className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => onRemoveTag(index)}
                  aria-label={`Remove ${tag.text} tag`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </Badge>
            
            {colorPickerIndex === index && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="grid grid-cols-4 gap-1">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorSelect(index, color)}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full mt-2 h-6 text-xs"
                  onClick={() => handleColorSelect(index, '')}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        ))}
        
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleAddTag}
          placeholder={tags.length > 0 ? "Add another..." : placeholder}
          className="flex-1 h-auto py-1 px-1 border-none shadow-none focus-visible:ring-0 text-sm min-w-[120px] bg-transparent"
        />
      </div>
    </div>
  );
}
