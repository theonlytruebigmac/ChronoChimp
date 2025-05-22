
'use client';

import type { Task } from '@/components/tasks/TaskItem';
import { Calendar } from '@/components/ui/calendar'; // ShadCN Calendar
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid } from 'date-fns';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CalendarViewProps {
  tasks: Task[];
}

// Helper function for status badge variant
const getStatusBadgeVariant = (status?: Task['status']): React.ComponentProps<typeof Badge>['variant'] => {
  switch (status) {
    case 'Done': return 'default';
    case 'In Progress': return 'secondary';
    case 'Review': return 'outline';
    case 'Backlog': return 'destructive';
    default: return 'secondary';
  }
};

export function CalendarView({ tasks }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState<Task[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (selectedDate && tasks) {
      const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
      const tasksOnDate = tasks.filter(task => 
        task.dueDate && isValid(parseISO(task.dueDate)) && format(parseISO(task.dueDate), 'yyyy-MM-dd') === formattedSelectedDate
      );
      setEventsForSelectedDate(tasksOnDate);
    } else {
      setEventsForSelectedDate([]);
    }
  }, [selectedDate, tasks]);

  const daysWithTasks = tasks
    .filter(task => task.dueDate && isValid(parseISO(task.dueDate)))
    .map(task => parseISO(task.dueDate!));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Task Calendar</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center p-2 sm:p-4">
            {isClient ? (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                modifiers={{ 
                  tasksDue: daysWithTasks
                }}
                modifiersClassNames={{
                  tasksDue: 'bg-primary/20 text-primary-foreground rounded-full font-semibold'
                }}
                disabled={(date) => date < new Date("1900-01-01") || date > new Date("2200-01-01")} // Prevent extreme dates just in case
              />
            ) : (
              <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">Loading calendar...</div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="md:col-span-1">
        <Card className="shadow-md h-full">
          <CardHeader>
            <CardTitle className="text-lg">
              Tasks for: {isClient && selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'No date selected'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isClient && eventsForSelectedDate.length > 0 ? (
              eventsForSelectedDate.map(task => (
                <Link key={task.id} href={`/tasks/view/${task.id}`} className="block hover:bg-muted/80 rounded-md transition-colors">
                  <div className="p-3 border rounded-md bg-muted/50 ">
                    <p className="font-medium text-sm">{task.title}</p>
                    <Badge variant={getStatusBadgeVariant(task.status)} className="mt-1 text-xs">{task.status}</Badge>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground pt-2">
                {isClient ? 'No tasks due on this date.' : 'Loading tasks...'}
              </p>
            )}
             <p className="mt-4 text-xs text-muted-foreground">
              Click on a date to see tasks. Days with tasks are highlighted.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
