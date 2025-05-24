'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Task, Subtask, TimeLog, TaskStatus } from '@/components/tasks/TaskItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, XCircle, CalendarDays, Tag, AlertTriangle, ListChecks, StickyNote, Clock, Play, Square, ChevronLeft, ChevronRight, Activity, X, Plus, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO, isValid } from 'date-fns';
import { cn, formatDuration, calculateDurationInSeconds, formatDateForInput, formatInputDateToISO } from '@/lib/utils';
import { TimeLogDialog } from '@/components/tasks/TimeLogDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTask, updateTask as updateTaskApi } from '@/lib/api/tasks';
import { Skeleton } from '@/components/ui/skeleton';
import { TagInput, TagData } from '@/components/tasks/TagInput';

// Create a type for the editable task with TagData[]
type EditableTask = Omit<Task, 'tags'> & {
  tags?: TagData[];
};

const taskStatuses: TaskStatus[] = ['Backlog', 'In Progress', 'Review', 'Done'];


export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.taskId as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: task, isLoading: isLoadingTask, isError, error: taskError, refetch } = useQuery<Task, Error>({
    queryKey: ['task', taskId],
    queryFn: () => fetchTask(taskId),
    enabled: !!taskId,
  });

  const [editableTask, setEditableTask] = useState<Partial<EditableTask>>({});
  const [originalTask, setOriginalTask] = useState<Task | null>(null);

  const [newTagValue, setNewTagValue] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStartTimestamp, setTimerStartTimestamp] = useState<number | null>(null);
  const [currentElapsedTimeDisplay, setCurrentElapsedTimeDisplay] = useState('00:00:00');
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isTimeLogDialogOpen, setIsTimeLogDialogOpen] = useState(false);
  const [timeLogNotes, setTimeLogNotes] = useState('');

  const [timeLogCurrentPage, setTimeLogCurrentPage] = useState(1);
  const [timeLogItemsPerPage, setTimeLogItemsPerPage] = useState(10);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (task) {
      // Convert tags to TagData format if they're strings
      let processedTags: TagData[] = [];
      if (task.tags && Array.isArray(task.tags)) {
        processedTags = task.tags.map((tag: any) => {
          if (typeof tag === 'string') {
            return { text: tag };
          } else {
            return { text: tag.text, color: tag.color || '' };
          }
        });
      }

      setEditableTask({
        ...task,
        tags: processedTags,
        subtasks: task.subtasks || [],
        timeLogs: task.timeLogs || [],
        notes: task.notes || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        status: task.status || 'Backlog',
      });
      setOriginalTask(JSON.parse(JSON.stringify(task)));
    } else {
      setEditableTask({});
      setOriginalTask(null);
    }
  }, [task]);

  const updateTaskMutation = useMutation({
    mutationFn: (taskData: Partial<EditableTask>) => {
      // Convert EditableTask format back to Task format for API
      const { tags, ...restData } = taskData;
      
      // Convert TagData[] to string[] which is what the API expects
      const apiData: any = {
        ...restData,
        tags: tags ? tags.map(tag => (typeof tag === 'string' ? { text: tag } : tag)) : undefined
      };
      
      return updateTaskApi(taskId, apiData);
    },
    onSuccess: (updatedTaskData) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.setQueryData(['task', taskId], updatedTaskData);
      setOriginalTask(JSON.parse(JSON.stringify(updatedTaskData)));
      toast({
        title: "Task Updated",
        description: `Task "${updatedTaskData.title}" has been successfully updated.`,
      });
      router.push('/tasks');
    },
    onError: (err: Error) => {
      toast({
        title: "Error Updating Task",
        description: err.message || "Could not save task. Please try again.",
        variant: "destructive",
      });
    },
  });


  const updateCurrentElapsedTime = useCallback(() => {
    if (timerStartTimestamp) {
      const seconds = Math.floor((Date.now() - timerStartTimestamp) / 1000);
      setCurrentElapsedTimeDisplay(formatDuration(seconds));
    }
  }, [timerStartTimestamp]);

  useEffect(() => {
    if (isTimerRunning && timerStartTimestamp) {
      updateCurrentElapsedTime();
      timerIntervalRef.current = setInterval(updateCurrentElapsedTime, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning, timerStartTimestamp, updateCurrentElapsedTime]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditableTask(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value: string) => {
    setEditableTask(prev => ({ ...prev, status: value as TaskStatus }));
  };

  const handlePriorityChange = (value: string) => {
    setEditableTask(prev => ({ ...prev, priority: value as 'high' | 'medium' | 'low' }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditableTask(prev => ({ ...prev, [name]: formatInputDateToISO(value) }));
  };

  const handleNewTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTagValue(e.target.value);
  };

  const handleTagInputChange = (value: string) => {
    setNewTagValue(value);
  };

  const handleAddTag = (tag: TagData) => {
    if (tag.text && !editableTask.tags?.some(t => t.text === tag.text)) {
      setEditableTask(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag],
      }));
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setEditableTask(prev => ({
      ...prev,
      tags: (prev.tags || []).filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleUpdateTagColor = (index: number, color: string) => {
    setEditableTask(prev => {
      const updatedTags = [...(prev.tags || [])];
      updatedTags[index] = { ...updatedTags[index], color };
      return { ...prev, tags: updatedTags };
    });
  };

  const handleNewSubtaskTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewSubtaskTitle(e.target.value);
  };

  const handleSubtaskToggle = (subtaskId: string) => {
    setEditableTask(prevTask => {
      if (!prevTask) return {};
      return {
        ...prevTask,
        subtasks: (prevTask.subtasks || []).map(st =>
          st.id === subtaskId ? { ...st, completed: !st.completed } : st
        ),
      };
    });
  };

  const handleAddNewSubtask = () => {
    if (!newSubtaskTitle.trim()) {
      toast({ title: "Subtask Title Empty", description: "Please enter a title for the new subtask.", variant: "destructive"});
      setNewSubtaskTitle('');
      return;
    }
    const newSubtask: Subtask = {
      id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    setEditableTask(prevTask => ({
      ...prevTask,
      subtasks: [...(prevTask.subtasks || []), newSubtask],
    }));
    setNewSubtaskTitle('');
    toast({ title: "Subtask Added", description: `Subtask "${newSubtask.title}" added. Save task to persist.`});
  };

  const handleNewSubtaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNewSubtask();
    }
  };

  const handleRemoveSubtask = (subtaskIdToRemove: string) => {
    setEditableTask(prevTask => ({
      ...prevTask,
      subtasks: (prevTask.subtasks || []).filter(st => st.id !== subtaskIdToRemove),
    }));
    toast({ title: "Subtask Removed", description: "Subtask has been removed. Save task to persist."});
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editableTask || !taskId || Object.keys(editableTask).length === 0) return;

    const { id, createdAt, updatedAt, ...taskDataToSubmit } = editableTask;
    updateTaskMutation.mutate(taskDataToSubmit);
  };

  const handleCancel = () => {
    if (originalTask) {
      setEditableTask(JSON.parse(JSON.stringify(originalTask)));
      setNewTagValue('');
      setNewSubtaskTitle('');
    }
     if (isTimerRunning) {
      setIsTimerRunning(false);
      setTimerStartTimestamp(null);
      setCurrentElapsedTimeDisplay('00:00:00');
    }
    router.push('/tasks');
  };

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

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      setIsTimerRunning(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
       if (timerStartTimestamp && (Date.now() - timerStartTimestamp > 1000)) {
        setIsTimeLogDialogOpen(true);
      } else {
        setTimerStartTimestamp(null);
        setCurrentElapsedTimeDisplay('00:00:00');
      }
    } else {
      setTimerStartTimestamp(Date.now());
      setIsTimerRunning(true);
      setCurrentElapsedTimeDisplay('00:00:00');
    }
  };

  const handleSaveTimeLog = (notes: string) => {
    if (!timerStartTimestamp) return;

     const endTimeMs = Date.now();
    const durationSeconds = Math.floor((endTimeMs - timerStartTimestamp) / 1000);

    if (durationSeconds <= 0) {
      toast({
        title: "Timer Stopped",
        description: "No significant time was recorded to log.",
        variant: "default"
      });
      setTimerStartTimestamp(null);
      setCurrentElapsedTimeDisplay('00:00:00');
      setTimeLogNotes('');
      setIsTimeLogDialogOpen(false);
      return;
    }

    const newTimeLog: TimeLog = {
      id: `tl-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
      startTime: new Date(timerStartTimestamp).toISOString(),
      endTime: new Date(endTimeMs).toISOString(),
      notes: notes,
    };

    setEditableTask(prevTask => {
      if (!prevTask) return {};
      const updatedTimeLogs = [...(prevTask.timeLogs || []), newTimeLog];
      return { ...prevTask, timeLogs: updatedTimeLogs };
    });

    setTimerStartTimestamp(null);
    setCurrentElapsedTimeDisplay('00:00:00');
    setTimeLogNotes('');
    setIsTimeLogDialogOpen(false);

    toast({
      title: "Time Logged",
      description: "Your time has been added. Save task to persist.",
    });
  };

  const calculateTotalLoggedTimeSeconds = (timeLogs?: TimeLog[]): number => {
    if (!timeLogs || timeLogs.length === 0) return 0;
    return timeLogs.reduce((total, log) => total + calculateDurationInSeconds(log.startTime, log.endTime), 0);
  };

  const sortedTimeLogs = editableTask?.timeLogs?.slice().sort((a,b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime()) || [];
  const totalTimeLogPages = Math.ceil(sortedTimeLogs.length / timeLogItemsPerPage);
  const paginatedTimeLogs = sortedTimeLogs.slice(
    (timeLogCurrentPage - 1) * timeLogItemsPerPage,
    timeLogCurrentPage * timeLogItemsPerPage
  );

  const handleTimeLogItemsPerPageChange = (value: string) => {
    setTimeLogItemsPerPage(parseInt(value, 10));
    setTimeLogCurrentPage(1);
  };


  if (isLoadingTask) {
    return (
        <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-36 rounded-md" />
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-24 rounded-md" />
                    <Skeleton className="h-9 w-32 rounded-md" />
                </div>
            </div>
            <Card className="shadow-lg">
                <CardHeader>
                    <Skeleton className="h-8 w-3/4 mb-2 rounded-md" />
                    <Skeleton className="h-4 w-1/2 rounded-md" />
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-20 w-full rounded-md" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
                    </div>
                    <Skeleton className="h-20 w-full rounded-md" />
                    <Skeleton className="h-20 w-full rounded-md" />
                    <Skeleton className="h-24 w-full rounded-md" />
                    <Skeleton className="h-24 w-full rounded-md" />
                    <Skeleton className="h-24 w-full rounded-md" />
                </CardContent>
                <CardFooter className="border-t px-6 py-4 justify-end gap-2 mt-6">
                    <Skeleton className="h-9 w-24 rounded-md" />
                    <Skeleton className="h-9 w-32 rounded-md" />
                </CardFooter>
            </Card>
        </div>
    );
  }

  if (isError || (!isLoadingTask && (!editableTask || Object.keys(editableTask).length === 0))) {
    const isTaskNotFound = taskError?.message === 'Task not found';
    return (
      <div className="space-y-6 text-center p-8 max-w-4xl mx-auto">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold text-destructive">
          {isTaskNotFound ? 'Task Not Found' : 'Failed to load task details'}
        </h2>
        <p className="text-muted-foreground">
          {isTaskNotFound ? "The task you are looking for doesn't exist or may have been deleted." : (taskError?.message || "An unexpected error occurred while fetching task details.")}
        </p>
        <div className="flex gap-2 justify-center">
            <Button onClick={() => router.push('/tasks')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tasks
            </Button>
            {!isTaskNotFound && taskId && (
                 <Button onClick={() => refetch()}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Retry
                </Button>
            )}
        </div>
      </div>
    );
  }

  const totalLoggedTimeSeconds = calculateTotalLoggedTimeSeconds(editableTask.timeLogs);

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <TimeLogDialog
        isOpen={isTimeLogDialogOpen}
        onClose={() => {
          setIsTimeLogDialogOpen(false);
          if (!isTimerRunning && timerStartTimestamp) {
             setTimerStartTimestamp(null);
             setCurrentElapsedTimeDisplay('00:00:00');
          }
        }}
        onSave={handleSaveTimeLog}
        initialNotes={timeLogNotes}
        setInitialNotes={setTimeLogNotes}
      />

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => router.push('/tasks')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tasks
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={updateTaskMutation.isPending}>
            <XCircle className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button size="sm" onClick={() => handleSubmit()} disabled={updateTaskMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateTaskMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl break-words">Edit: {originalTask?.title || editableTask.title || 'Task'}</CardTitle>
            <CardDescription>Modify the details of your task below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-base">Title</Label>
              <Input id="title" name="title" value={editableTask.title || ''} onChange={handleInputChange} required className="text-base" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-base">Description</Label>
              <Textarea id="description" name="description" value={editableTask.description || ''} onChange={handleInputChange} rows={4} className="text-base" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <div className="space-y-1.5">
                <Label htmlFor="status" className="flex items-center text-base"><Activity className="mr-1.5 h-4 w-4 text-muted-foreground" /> Status</Label>
                <Select name="status" value={editableTask.status} onValueChange={handleStatusChange}>
                  <SelectTrigger id="status" className="text-base">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {taskStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priority" className="flex items-center text-base"><AlertTriangle className="mr-1.5 h-4 w-4 text-muted-foreground" /> Priority</Label>
                <Select name="priority" value={editableTask.priority || 'medium'} onValueChange={handlePriorityChange}>
                  <SelectTrigger id="priority" className="text-base">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="flex items-center text-base"><CalendarDays className="mr-1.5 h-4 w-4 text-muted-foreground" /> Start Date</Label>
                <Input id="startDate" name="startDate" type="date" value={formatDateForInput(editableTask.startDate)} onChange={handleDateChange} className="text-base" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dueDate" className="flex items-center text-base"><CalendarDays className="mr-1.5 h-4 w-4 text-muted-foreground" /> Due Date</Label>
                <Input id="dueDate" name="dueDate" type="date" value={formatDateForInput(editableTask.dueDate)} onChange={handleDateChange} className="text-base" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tagsInput" className="flex items-center text-base">
                <Tag className="mr-1.5 h-4 w-4 text-muted-foreground" /> Tags
              </Label>
              <TagInput
                tags={editableTask.tags || []}
                inputValue={newTagValue}
                onInputChange={handleTagInputChange}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                onUpdateTagColor={handleUpdateTagColor}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="flex items-center text-base"><StickyNote className="mr-1.5 h-4 w-4 text-muted-foreground" /> Notes</Label>
              <Textarea id="notes" name="notes" value={editableTask.notes || ''} onChange={handleInputChange} rows={3} className="text-base" />
            </div>

            <Card className="bg-muted/30 border-dashed">
                <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-lg flex items-center"><Clock className="mr-2 h-5 w-5 text-muted-foreground" />Task Timer</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-3">
                        <Button type="button" onClick={handleToggleTimer} variant={isTimerRunning ? "destructive" : "default"} size="lg">
                            {isTimerRunning ? <Square className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                            {isTimerRunning ? 'Stop Timer' : 'Start Timer'}
                        </Button>
                        <span className="text-2xl font-mono font-semibold tabular-nums">
                            {currentElapsedTimeDisplay}
                        </span>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Time Logged</p>
                        <p className="text-xl font-semibold">{formatDuration(totalLoggedTimeSeconds)}</p>
                    </div>
                </CardContent>
            </Card>


            <div className="space-y-2">
              <Label className="flex items-center text-base"><ListChecks className="mr-1.5 h-4 w-4 text-muted-foreground" /> Subtasks</Label>
              <div className="space-y-3 rounded-md border p-4 bg-muted/30">
                {editableTask.subtasks && editableTask.subtasks.map(subtask => (
                  <div key={subtask.id} className="flex items-center justify-between gap-3 p-2 bg-background rounded-md shadow-sm">
                    <div className="flex items-center gap-3 flex-grow">
                      <Checkbox
                        id={`subtask-edit-${subtask.id}`}
                        checked={subtask.completed}
                        onCheckedChange={() => handleSubtaskToggle(subtask.id)}
                      />
                      <label
                        htmlFor={`subtask-edit-${subtask.id}`}
                        className={`text-sm cursor-pointer ${subtask.completed ? 'line-through text-muted-foreground' : ''} flex-grow break-words`}
                      >
                        {subtask.title}
                      </label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveSubtask(subtask.id)}
                      aria-label="Remove subtask"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(!editableTask.subtasks || editableTask.subtasks.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-2">No subtasks yet. Add one below.</p>
                )}
                 <div className="flex items-center gap-2 pt-3 border-t border-dashed mt-3">
                    <Input
                      id="newSubtaskTitle"
                      name="newSubtaskTitle"
                      value={newSubtaskTitle}
                      onChange={handleNewSubtaskTitleChange}
                      onKeyDown={handleNewSubtaskKeyDown}
                      placeholder="Enter new subtask title"
                      className="flex-grow text-sm"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddNewSubtask}>
                      <Plus className="mr-1.5 h-4 w-4" /> Add Subtask
                    </Button>
                  </div>
              </div>
            </div>


            {sortedTimeLogs.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center text-base"><Clock className="mr-1.5 h-4 w-4 text-muted-foreground" /> Recorded Time Logs</Label>
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
             {sortedTimeLogs.length === 0 && editableTask.timeLogs && editableTask.timeLogs.length === 0 && (
                 <div className="space-y-2">
                    <Label className="flex items-center text-base"><Clock className="mr-1.5 h-4 w-4 text-muted-foreground" /> Recorded Time Logs</Label>
                    <p className="text-sm text-muted-foreground">No time logs recorded yet for this task.</p>
                </div>
            )}


          </CardContent>
          <CardFooter className="border-t px-6 py-4 justify-end gap-2 mt-6">
             <Button variant="outline" type="button" onClick={handleCancel} disabled={updateTaskMutation.isPending}>
                <XCircle className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button type="submit" disabled={updateTaskMutation.isPending}>
              {updateTaskMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

