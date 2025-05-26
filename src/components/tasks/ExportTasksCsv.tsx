import React from 'react';
import { Button } from '@/components/ui/button';
import { DownloadCloud } from 'lucide-react';
import Papa from 'papaparse';
import type { Task } from '@/components/tasks/TaskItem';

interface ExportTasksCsvProps {
  tasks: Task[];
  className?: string;
}

export const ExportTasksCsv: React.FC<ExportTasksCsvProps> = ({ tasks, className }) => {
  const handleExport = () => {
    // Only export basic fields for now
    const csv = Papa.unparse(
      tasks.map(task => ({
        title: task.title,
        description: task.description || '',
        status: task.status || '',
        priority: task.priority || '',
        notes: task.notes || '',
        startDate: task.startDate || '',
        tags: task.tags ? task.tags.join(', ') : '',
        subtasks: task.subtasks ? task.subtasks.map(sub => sub.title).join(', ') : '',
        dueDate: task.dueDate || '',
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={tasks.length === 0} className={className}>
      <DownloadCloud className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
};
