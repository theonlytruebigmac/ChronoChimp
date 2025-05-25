import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseISO, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number) {
  if (isNaN(seconds) || seconds < 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":");
}

export function calculateDurationInSeconds(start: string, end: string) {
  try {
    const startDate = typeof start === "string" ? parseISO(start) : start;
    const endDate = typeof end === "string" ? parseISO(end) : end;
    if (!isValid(startDate) || !isValid(endDate)) return 0;
    return Math.max(
      0,
      Math.floor((endDate.getTime() - startDate.getTime()) / 1000)
    );
  } catch {
    return 0;
  }
}

export function formatDateForInput(dateString?: string) {
  if (!dateString) return "";
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return "";
    // Return yyyy-MM-dd for <input type="date">
    return date.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function formatInputDateToISO(input: string) {
  // input: yyyy-MM-dd, output: ISO string (yyyy-MM-ddT00:00:00.000Z)
  if (!input) return "";
  try {
    const date = new Date(input);
    if (!isValid(date)) return "";
    return date.toISOString();
  } catch {
    return "";
  }
}
