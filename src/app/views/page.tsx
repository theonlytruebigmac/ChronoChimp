
'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanView } from '@/components/views/KanbanView';
import { CalendarView } from '@/components/views/CalendarView';
import type { Task, TaskStatus } from '@/components/tasks/TaskItem';
import { Eye, AlertTriangle, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTasks, updateTask } from '@/lib/api/tasks';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';


export default function ViewsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast(); 

  const { data: tasks = [], isLoading, isError, error, refetch } = useQuery<Task[], Error>({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, taskData }: { taskId: string, taskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> }) => updateTask(taskId, taskData),
    onSuccess: (updatedTaskData) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', updatedTaskData.id]});
      // Success toast is now handled in KanbanView for drag-n-drop
    },
    onError: (err: Error) => {
      toast({ 
        title: "Error Updating Task Status",
        description: err.message || `Could not update task status. Please try again.`,
        variant: "destructive",
      });
    },
  });


  const handleTaskStatusChange = (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      updateTaskMutation.mutate({ taskId, taskData: { status: newStatus } });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 rounded-md" /> {/* Title Skeleton */}
        </div>
        <Skeleton className="h-10 w-full md:w-[400px] rounded-md" /> {/* TabsList Skeleton */}
        <Skeleton className="h-[400px] w-full mt-4 rounded-md" /> {/* TabsContent Skeleton */}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 text-center p-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold text-destructive">Failed to load views data</h2>
        <p className="text-muted-foreground">{error?.message || "An unexpected error occurred."}</p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center">
          <Eye className="mr-3 h-7 w-7 text-primary" />
          Task Views
        </h1>
      </div>
      <Tabs defaultValue="kanban" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 md:w-[400px]">
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>
        <TabsContent value="kanban" className="mt-4">
          <KanbanView tasks={tasks} onTaskStatusChange={handleTaskStatusChange} />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <CalendarView tasks={tasks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
