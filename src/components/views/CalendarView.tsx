'use client';

import type { Task } from '@/components/tasks/TaskItem';
import { Calendar } from '@/components/ui/calendar'; // ShadCN Calendar
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid, isSameDay, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

interface CalendarViewProps {
  tasks: Task[];
}

// Day component for the calendar
const CalendarDay = ({ day, month, selectedDate, setSelectedDate, tasks }: {
  day: number;
  month: Date;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  tasks: Task[];
}) => {
  const date = new Date(month.getFullYear(), month.getMonth(), day);
  const isSelected = isSameDay(date, selectedDate);
  const isSameMonthAsCurrentView = isSameMonth(date, month);
  const isCurrentDay = isToday(date);
  
  const hasTasksForDate = tasks.some(task => {
    if (!task.dueDate) return false;
    const taskDate = typeof task.dueDate === 'string' ? parseISO(task.dueDate) : task.dueDate;
    return isSameDay(taskDate, date);
  });

  return (
    <Button
      variant={isSelected ? "default" : isCurrentDay ? "outline" : "ghost"}
      className={`
        h-10 w-10 rounded-full p-0 font-normal
        ${!isSameMonthAsCurrentView && 'text-muted-foreground opacity-50'} 
        ${hasTasksForDate && !isSelected && 'bg-primary/10 hover:bg-primary/20'}
        ${isCurrentDay && !isSelected && 'border-primary border text-primary hover:text-primary'}
      `}
      onClick={() => setSelectedDate(date)}
    >
      {day}
    </Button>
  );
};

export function CalendarView({ tasks }: CalendarViewProps) {
  // Change the state type to ensure selectedDate is always a Date
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState<Task[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
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

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  
  // Get tasks for the selected date
  const tasksForSelectedDate = tasks.filter(task => {
    if (!task.dueDate) return false;
    const taskDate = typeof task.dueDate === 'string' ? parseISO(task.dueDate) : task.dueDate;
    return isSameDay(taskDate, selectedDate);
  });

  // Determine first day of month and starting day for calendar grid
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const startingDayIndex = firstDayOfMonth.getDay(); // 0 = Sunday
  
  // Determine days in current month
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  
  // Determine days in previous month for filling start of grid
  const daysInPrevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
  
  // Generate calendar grid
  const calendarDays = [];
  
  // Previous month days
  for (let i = startingDayIndex - 1; i >= 0; i--) {
    const prevMonthDay = daysInPrevMonth - i;
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, prevMonthDay);
    calendarDays.push({day: prevMonthDay, month: prevMonth});
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({day: i, month: currentMonth});
  }
  
  // Get days needed to fill out the grid (up to 42 spots for a 6x7 grid)
  const remainingDays = 42 - calendarDays.length;
  
  // Next month days
  for (let i = 1; i <= remainingDays; i++) {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i);
    calendarDays.push({day: i, month: nextMonth});
  }

  const daysWithTasks = tasks
    .filter(task => task.dueDate && isValid(parseISO(task.dueDate)))
    .map(task => parseISO(task.dueDate!));

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Calendar Panel - Maintain size but reduce whitespace */}
      <div className="flex-none lg:w-[400px] bg-card rounded-xl border shadow-sm p-4 lg:p-5">
        <h2 className="text-2xl font-semibold mb-4">Task Calendar</h2>
        
        <div className="flex flex-col items-center">
          {/* Month Navigation */}
          <div className="flex items-center justify-between w-full mb-4">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous month</span>
            </Button>
            <h3 className="text-xl font-medium">{format(currentMonth, 'MMMM yyyy')}</h3>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next month</span>
            </Button>
          </div>
          
          {/* Calendar Grid - Keep size consistent */}
          <div className="grid grid-cols-7 gap-2 w-full">
            {/* Day Headers */}
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            
            {/* Calendar Days */}
            {calendarDays.map((item, index) => (
              <CalendarDay
                key={`${item.month.getMonth()}-${item.day}-${index}`}
                day={item.day}
                month={item.month}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                tasks={tasks}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Tasks Panel - Takes remaining space */}
      <div className="flex-1 bg-card rounded-xl border shadow-sm p-4 lg:p-5">
        <h2 className="text-2xl font-semibold mb-4">
          Tasks for: {format(selectedDate, 'MMM d, yyyy')}
        </h2>
        
        {tasksForSelectedDate.length > 0 ? (
          <div className="space-y-3">
            {tasksForSelectedDate.map(task => (
              <div key={task.id} className="p-3 bg-muted/40 rounded-lg hover:bg-muted transition-colors">
                <h3 className="font-medium">{task.title}</h3>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {task.status || 'No status'}
                  </span>
                  {task.priority && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      task.priority === 'high' ? 'bg-destructive/10 text-destructive' : 
                      task.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' : 
                      'bg-green-500/10 text-green-500'
                    }`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 bg-muted/30 rounded-lg border border-dashed">
            <p className="text-muted-foreground font-medium">No tasks due on this date.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click on a date to see tasks. Days with tasks are highlighted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
