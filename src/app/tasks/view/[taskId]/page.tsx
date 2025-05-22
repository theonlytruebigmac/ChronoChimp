
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Task, Subtask, TimeLog, TaskStatus } from '@/components/tasks/TaskItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit2, CalendarDays, Tag, AlertTriangle, ListChecks, StickyNote, Clock, FileText, ChevronLeft, ChevronRight, Activity, RefreshCw } from 'lucide-react';
// import { useToast } from '@/hooks/use-toast'; // No toasts on view page typically
import { cn, formatDuration, calculateDurationInSeconds } from '@/lib/utils';
import { parseISO, isValid, format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { fetchTask } from '@/lib/api/tasks';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';


export default function TaskViewPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.taskId as string;

  const { data: task, isLoading, isError, error, refetch } = useQuery<Task, Error>({
    queryKey: ['task', taskId],
    queryFn: () => fetchTask(taskId),
    enabled: !!taskId,
  });

  const [isClient, setIsClient] = useState(false);
  const [timeLogCurrentPage, setTimeLogCurrentPage] = useState(1);
  const [timeLogItemsPerPage, setTimeLogItemsPerPage] = useState(10);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatDateSafe = (dateString?: string) => {
    if (!dateString) return 'N/A';
    if (!isClient) return '...';
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
         if (dateString.includes('T')) return format(date, 'MMM d, yyyy HH:mm');
        return format(date, 'MMM d, yyyy');
      }
    } catch (e) { /* ignore */ }
    return dateString;
  }

  const getPriorityClass = (priority?: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-500 border-red-500/50';
      case 'medium': return 'text-yellow-600 dark:text-yellow-500 border-yellow-500/50';
      case 'low': return 'text-green-600 dark:text-green-500 border-green-500/50';
      default: return 'text-muted-foreground border-muted-foreground/50';
    }
  };

  const getStatusBadgeVariant = (status?: TaskStatus): React.ComponentProps<typeof Badge>['variant'] => {
    switch (status) {
      case 'Done': return 'default';
      case 'In Progress': return 'secondary';
      case 'Review': return 'outline';
      case 'Backlog': return 'destructive';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-2/3 mt-1 rounded-md" />
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-5 w-1/2 rounded-md" />)}
            </div>
            <Skeleton className="h-10 w-full rounded-md" /> 
            <Skeleton className="h-20 w-full rounded-md" /> 
            <Skeleton className="h-24 w-full rounded-md" /> 
            <Skeleton className="h-24 w-full rounded-md" /> 
          </CardContent>
          <CardFooter className="border-t px-6 py-4 justify-end gap-2 mt-6">
            <Skeleton className="h-9 w-36 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="space-y-6 text-center p-8 max-w-4xl mx-auto">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold text-destructive">
          {error?.message === 'Task not found' ? 'Task Not Found' : 'Failed to load task details'}
        </h2>
        <p className="text-muted-foreground">
          {error?.message || "An unexpected error occurred while fetching task details."}
        </p>
         <div className="flex gap-2 justify-center">
            <Button onClick={() => router.push('/tasks')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tasks
            </Button>
            {error?.message !== 'Task not found' && taskId && (
                 <Button onClick={() => refetch()}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Retry
                </Button>
            )}
        </div>
      </div>
    );
  }

  const totalLoggedTimeSeconds = task.timeLogs?.reduce((total, log) => total + calculateDurationInSeconds(log.startTime, log.endTime), 0) || 0;
  const sortedTimeLogs = task.timeLogs?.slice().sort((a,b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime()) || [];
  const totalTimeLogPages = Math.ceil(sortedTimeLogs.length / timeLogItemsPerPage);
  const paginatedTimeLogs = sortedTimeLogs.slice(
    (timeLogCurrentPage - 1) * timeLogItemsPerPage,
    timeLogCurrentPage * timeLogItemsPerPage
  );
  const handleTimeLogItemsPerPageChange = (value: string) => {
    setTimeLogItemsPerPage(parseInt(value, 10));
    setTimeLogCurrentPage(1);
  };


  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => router.push('/tasks')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tasks
        </Button>
        <Link href={`/tasks/${task.id}`} passHref legacyBehavior>
          <Button size="sm">
            <Edit2 className="mr-2 h-4 w-4" /> Edit Task
          </Button>
        </Link>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center justify-between break-words">
            {task.title}
            <Badge variant={getStatusBadgeVariant(task.status)} className="text-sm ml-4 flex-shrink-0">
                <Activity className="mr-1.5 h-3.5 w-3.5" />
                {task.status}
            </Badge>
          </CardTitle>
          {task.description && (
            <CardDescription className="pt-2 text-base break-words">{task.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            {task.priority && (
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn("h-5 w-5", getPriorityClass(task.priority))} />
                <span className="font-medium">Priority:</span>
                <Badge variant="outline" className={cn("capitalize", getPriorityClass(task.priority))}>
                  {task.priority}
                </Badge>
              </div>
            )}
             <div className="flex items-center gap-2">
                <Clock className={cn("h-5 w-5", totalLoggedTimeSeconds > 0 ? 'text-primary' : 'text-muted-foreground')} />
                <span className="font-medium">Total Time Logged:</span>
                <span>{formatDuration(totalLoggedTimeSeconds)}</span>
            </div>
            {task.startDate && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Start Date:</span>
                <span>{formatDateSafe(task.startDate)}</span>
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Due Date:</span>
                <span>{formatDateSafe(task.dueDate)}</span>
              </div>
            )}
          </div>

          {task.tags && task.tags.length > 0 && (
            <div className="space-y-1.5">
              <Label className="flex items-center text-base font-semibold"><Tag className="mr-1.5 h-4 w-4 text-muted-foreground" /> Tags</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {task.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-sm">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {task.notes && (
            <div className="space-y-1.5">
              <Label className="flex items-center text-base font-semibold"><StickyNote className="mr-1.5 h-4 w-4 text-muted-foreground" /> Notes</Label>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-md border border-dashed break-words">{task.notes}</p>
            </div>
          )}

          {task.subtasks && task.subtasks.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center text-base font-semibold"><ListChecks className="mr-1.5 h-4 w-4 text-muted-foreground" /> Subtasks</Label>
              <div className="space-y-2 rounded-md border p-4 bg-muted/30">
                {task.subtasks.map(subtask => (
                  <div key={subtask.id} className="flex items-center gap-3 p-2 bg-background rounded-md shadow-sm">
                    <Checkbox
                      id={`subtask-view-${subtask.id}`}
                      checked={subtask.completed}
                      disabled // Read-only
                      aria-label={`Subtask ${subtask.title} is ${subtask.completed ? 'completed' : 'incomplete'}`}
                    />
                    <label
                      htmlFor={`subtask-view-${subtask.id}`}
                      className={`text-sm ${subtask.completed ? 'line-through text-muted-foreground' : ''} break-words`}
                    >
                      {subtask.title}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedTimeLogs.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center text-base font-semibold"><Clock className="mr-1.5 h-4 w-4 text-muted-foreground" /> Recorded Time Logs</Label>
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="p-4 space-y-3">
                    {paginatedTimeLogs.map(log => (
                      <div key={log.id} className="text-sm p-3 border rounded-md bg-background shadow-sm">
                        <div className="flex justify-between items-center">
                          <p className="font-medium">
                             {formatDateSafe(log.startTime)} - {formatDateSafe(log.endTime)}
                          </p>
                          <Badge variant="outline" className="font-mono">{formatDuration(calculateDurationInSeconds(log.startTime, log.endTime))}</Badge>
                        </div>
                        {log.notes && <p className="text-xs text-muted-foreground mt-1.5 pt-1.5 border-t border-dashed break-words">Notes: {log.notes}</p>}
                      </div>
                    ))}
                  </CardContent>
                  {totalTimeLogPages > 1 && (
                    <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 p-4 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rows per page:</span>
                        <Select value={String(timeLogItemsPerPage)} onValueChange={handleTimeLogItemsPerPageChange}>
                          <SelectTrigger className="w-[70px] h-8 text-xs">
                            <SelectValue placeholder={String(timeLogItemsPerPage)} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        Page {timeLogCurrentPage} of {totalTimeLogPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => setTimeLogCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={timeLogCurrentPage === 1}
                          className="h-8"
                        >
                           <ChevronRight className="h-4 w-4 mr-1 transform rotate-180" /> Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => setTimeLogCurrentPage(prev => Math.min(totalTimeLogPages, prev + 1))}
                          disabled={timeLogCurrentPage === totalTimeLogPages}
                          className="h-8"
                        >
                          Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardFooter>
                  )}
                </Card>
              </div>
            )}
             {sortedTimeLogs.length === 0 && task.timeLogs && (
                 <div className="space-y-2">
                    <Label className="flex items-center text-base font-semibold"><Clock className="mr-1.5 h-4 w-4 text-muted-foreground" /> Recorded Time Logs</Label>
                    <p className="text-sm text-muted-foreground">No time logs recorded yet for this task.</p>
                </div>
            )}
        </CardContent>
        <CardFooter className="border-t px-6 py-4 justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => router.push('/tasks')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tasks
            </Button>
             <Link href={`/tasks/${task.id}`} passHref legacyBehavior>
                <Button>
                    <Edit2 className="mr-2 h-4 w-4" /> Edit Task
                </Button>
            </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
