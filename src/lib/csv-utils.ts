import Papa from 'papaparse';

// Define the expected shape of a task
export interface CsvTask {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  notes?: string;
  startDate?: string; // ISO string or date string
  tags?: string[]; // Array of tag strings
  subtasks?: { title: string; completed: boolean }[]; // Array of subtask objects
  dueDate?: string; // ISO string or date string
}

/**
 * Parses a CSV string into an array of CsvTask objects.
 * Supports columns: title, description, status, priority, notes, startDate, tags, subtasks, dueDate
 * - tags: comma-separated string (e.g. "tag1, tag2")
 * - subtasks: comma-separated string (e.g. "subtask1, subtask2")
 * @param csvString The CSV file contents as a string
 * @returns Array of CsvTask objects
 */
export function parseTasksCsv(csvString: string): CsvTask[] {
  const { data, errors } = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
  });
  if (errors.length > 0) {
    throw new Error('CSV parsing error: ' + errors.map((e: any) => e.message).join('; '));
  }
  return (data as any[]).filter(row => row.title && row.title.trim() !== '').map(row => ({
    title: row.title,
    description: row.description || '',
    status: row.status || 'Backlog',
    priority: row.priority || 'medium',
    notes: row.notes || '',
    startDate: row.startDate || '',
    tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    subtasks: row.subtasks ? row.subtasks.split(',').map((t: string) => ({ title: t.trim(), completed: false })).filter((st: { title: string }) => st.title) : [],
    dueDate: row.dueDate || '',
  }));
}
