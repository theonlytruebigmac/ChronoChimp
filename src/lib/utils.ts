
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInSeconds, parseISO, isValid, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a duration in total seconds into a HH:MM:SS string.
 * @param totalSeconds The total duration in seconds.
 * @returns A string formatted as HH:MM:SS.
 */
export function formatDuration(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return "00:00:00";
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (num: number) => num.toString().padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Calculates the duration in seconds between two ISO date strings.
 * @param isoStartTime The start time in ISO 8601 format.
 * @param isoEndTime The end time in ISO 8601 format.
 * @returns The duration in seconds, or 0 if dates are invalid.
 */
export function calculateDurationInSeconds(isoStartTime?: string, isoEndTime?: string): number {
  if (!isoStartTime || !isoEndTime) return 0;

  try {
    const startTime = parseISO(isoStartTime);
    const endTime = parseISO(isoEndTime);

    if (isValid(startTime) && isValid(endTime)) {
      return differenceInSeconds(endTime, startTime);
    }
  } catch (error) {
    console.error("Error parsing dates for duration calculation:", error);
  }
  return 0;
}

/**
 * Formats an ISO date string (or a string that can be parsed as such) into 'yyyy-MM-dd' format for date inputs.
 * Returns an empty string if the date is undefined or invalid.
 * This function uses UTC date parts to avoid timezone shifts.
 * @param isoDate Optional ISO date string.
 * @returns Date string in 'yyyy-MM-dd' format or empty string.
 */
export const formatDateForInput = (isoDate?: string): string => {
  if (!isoDate) return '';
  try {
    const date = parseISO(isoDate); // date-fns parseISO correctly handles 'Z' or offset
    if (isValid(date)) {
      // If it was already a 'yyyy-MM-dd' string, just return it
      if (isoDate.length === 10 && isoDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return isoDate;
      }
      // Use UTC components to construct the yyyy-MM-dd string
      const year = date.getUTCFullYear();
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0'); // getUTCMonth is 0-indexed
      const day = date.getUTCDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    // ignore if not a valid ISO string
  }
  return ''; 
};

/**
 * Converts a date string from 'yyyy-MM-dd' format (typically from a date input) to an ISO string (UTC midnight).
 * Returns undefined if the input date is empty or invalid.
 * @param inputDate Optional date string in 'yyyy-MM-dd' format.
 * @returns ISO date string (UTC midnight) or undefined.
 */
export const formatInputDateToISO = (inputDate?: string): string | undefined => {
  if (!inputDate) return undefined;
  try {
    // Check if the inputDate is already a full ISO string (e.g., from a previous correct formatting)
    if (inputDate.includes('T') && inputDate.includes('Z')) {
        const date = parseISO(inputDate);
        if (isValid(date)) return date.toISOString();
    }

    const parts = inputDate.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) -1; // Month is 0-indexed in JS Date
        const day = parseInt(parts[2], 10);
        
        if (isNaN(year) || isNaN(month) || isNaN(day) || month < 0 || month > 11 || day < 1 || day > 31) {
          return undefined;
        }

        const date = new Date(Date.UTC(year, month, day, 0, 0, 0));
        // Double check that the created date matches the input, as Date constructor can be lenient
        if (isValid(date) && date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
            return date.toISOString(); // Returns "YYYY-MM-DDTHH:mm:ss.sssZ"
        }
    }
  } catch (error) {
    // ignore
  }
  return undefined; 
};
