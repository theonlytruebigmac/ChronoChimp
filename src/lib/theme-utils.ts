import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export type ColorScheme = 'blue' | 'purple' | 'teal' | 'green' | 'amber' | 'rose' | 'slate';

export type ThemeColors = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
};

export const colorSchemes: Record<ColorScheme, ThemeColors> = {
  blue: {
    primary: '79 70 229', // indigo-600
    secondary: '20 184 166', // teal-500
    accent: '245 208 254', // fuchsia-200
    background: '240 250 255', // light blue
    foreground: '30 41 59', // slate-800
  },
  purple: {
    primary: '139 92 246', // violet-500
    secondary: '236 72 153', // pink-500
    accent: '254 240 138', // yellow-200
    background: '245 243 255', // light purple
    foreground: '36 32 56', // dark purple
  },
  teal: {
    primary: '20 184 166', // teal-500
    secondary: '79 70 229', // indigo-600
    accent: '254 205 211', // rose-200
    background: '240 253 250', // teal-50
    foreground: '19 78 74', // teal-900
  },
  green: {
    primary: '34 197 94', // green-500
    secondary: '245 158 11', // amber-500
    accent: '216 180 254', // violet-200
    background: '240 253 244', // green-50
    foreground: '20 83 45', // green-900
  },
  amber: {
    primary: '245 158 11', // amber-500
    secondary: '14 165 233', // sky-500
    accent: '254 215 170', // orange-200
    background: '255 251 235', // amber-50
    foreground: '120 53 15', // amber-900
  },
  rose: {
    primary: '244 63 94', // rose-500
    secondary: '139 92 246', // violet-500
    accent: '186 230 253', // sky-200
    background: '255 241 242', // rose-50
    foreground: '159 18 57', // rose-900
  },
  slate: {
    primary: '51 65 85', // slate-700
    secondary: '71 85 105', // slate-600
    accent: '248 250 252', // slate-50
    background: '241 245 249', // slate-100
    foreground: '15 23 42', // slate-900
  },
};

// Hook to apply a color scheme
export function useColorScheme() {
  const { theme, setTheme } = useTheme();
  const [colorScheme, setColorScheme] = useState<ColorScheme>('blue');

  // Apply color scheme
  const applyColorScheme = (scheme: ColorScheme) => {
    const colors = colorSchemes[scheme];
    const style = document.createElement('style');
    
    // Create CSS rules that will override the default theme
    const css = `
      :root {
        --primary: ${colors.primary} !important;
        --secondary: ${colors.secondary} !important;
        --accent: ${colors.accent} !important;
        ${theme !== 'dark' ? `
        --background: ${colors.background} !important;
        --foreground: ${colors.foreground} !important;
        ` : ''}
      }
    `;
    
    // Remove any previous dynamic theme
    const existingStyle = document.getElementById('dynamic-theme');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Add the new theme
    style.id = 'dynamic-theme';
    style.textContent = css;
    document.head.appendChild(style);

    // Store preference
    localStorage.setItem('color-scheme', scheme);
    setColorScheme(scheme);
  };

  // Initialize color scheme from localStorage or default to blue
  useEffect(() => {
    const savedScheme = localStorage.getItem('color-scheme') as ColorScheme | null;
    if (savedScheme && colorSchemes[savedScheme]) {
      applyColorScheme(savedScheme);
    } else {
      // Use blue as default if no saved scheme
      applyColorScheme('blue');
    }
  }, []);

  // Listen for theme changes
  useEffect(() => {
    if (theme === 'dark') {
      // When switching to dark mode, we still want to keep the accent colors
      const currentColors = colorSchemes[colorScheme];
      document.documentElement.style.setProperty('--primary', currentColors.primary);
      document.documentElement.style.setProperty('--secondary', currentColors.secondary);
      document.documentElement.style.setProperty('--accent', currentColors.accent);
    } else if (theme === 'light') {
      // When switching to light mode, reapply the full color scheme
      applyColorScheme(colorScheme);
    }
  }, [theme]);

  return { colorScheme, applyColorScheme };
}

// Function to get contrasting text color
export function getContrastColor(hexColor: string): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
