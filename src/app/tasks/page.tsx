"use client";

import React, { useState } from 'react';
import { TaskList } from '@/components/tasks/TaskList';
import type { Task, Subtask, TaskStatus, TimeLog } from '@/components/tasks/TaskItem';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { NewTaskDialog } from '@/components/tasks/NewTaskDialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTasks, createTask, updateTask, deleteTask as deleteTaskApi } from '@/lib/api/tasks';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImportTasksCsv } from '@/components/tasks/ImportTasksCsv';
import { ExportTasksCsv } from '@/components/tasks/ExportTasksCsv';


export default function TasksPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);

  const { data: tasks = [], isLoading, isError, error, refetch } = useQuery<Task[], Error>({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  });

  const createTaskMutation = useMutation({
    mutationFn: (newTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => createTask(newTaskData),
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "Task Added",
        description: `Task "${newTask.title}" has been successfully added.`,
      });
      setIsNewTaskDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Error Adding Task",
        description: err.message || "Could not add the task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, taskData }: { taskId: string, taskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> }) => updateTask(taskId, taskData),
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] });
      // Toast for specific updates (like subtask toggle) can be handled closer to the action if needed,
      // or a generic one here if preferred. For now, let's assume specific toasts are better.
      // toast({
      //   title: "Task Updated",
      //   description: `Task "${updatedTask.title}" has been updated.`,
      // });
    },
    onError: (err: Error) => {
      toast({
        title: "Error Updating Task",
        description: err.message || `Could not update task. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => deleteTaskApi(taskId),
    onSuccess: (data, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.removeQueries({ queryKey: ['task', taskId] }); // Remove specific task from cache
      toast({
        title: "Task Deleted",
        description: data.message, // API returns { message: "..." }
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Error Deleting Task",
        description: err.message || "Could not delete the task. Please try again.",
        variant: "destructive",
      });
    },
  });


  const handleAddTask = (newTaskData: Omit<Task, 'id' | 'timeLogs' | 'createdAt' | 'updatedAt'>) => {
    const taskToCreate: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
        ...newTaskData,
        timeLogs: [], 
        subtasks: newTaskData.subtasks || [],
        tags: newTaskData.tags || [],
        // Ensure default status if not provided by dialog, though dialog should provide it
        status: newTaskData.status || 'Backlog', 
    };
    createTaskMutation.mutate(taskToCreate);
  };

  // This function will be passed to TaskList, then to TaskItem
  const handleUpdateTask = (taskId: string, taskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>) => {
    updateTaskMutation.mutate({ taskId, taskData });
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">My Tasks</h1>
          <Button onClick={() => setIsNewTaskDialogOpen(true)} disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Task
          </Button>
        </div>
        <Card>
            <CardHeader>
                 <Skeleton className="h-7 w-1/3 mb-1" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-24 w-full rounded-md" />
                <Skeleton className="h-24 w-full rounded-md" />
                <Skeleton className="h-24 w-full rounded-md" />
            </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 text-center p-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold text-destructive">Failed to load tasks</h2>
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
        <h1 className="text-2xl font-semibold">My Tasks</h1>
        <div className="flex gap-2">
          <ImportTasksCsv onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })} className="hover:btn-primary" />
          <ExportTasksCsv tasks={tasks} className="hover:btn-primary" />
          <Button onClick={() => setIsNewTaskDialogOpen(true)} disabled={createTaskMutation.isPending} variant="outline" className="hover:btn-primary">
            <PlusCircle className="mr-2 h-4 w-4" />
            {createTaskMutation.isPending ? "Adding..." : "Add New Task"}
          </Button>
        </div>
      </div>

      <NewTaskDialog
        isOpen={isNewTaskDialogOpen}
        onClose={() => setIsNewTaskDialogOpen(false)}
        onAddTask={handleAddTask}
      />

      <TaskList 
        tasks={tasks} 
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
      />
    </div>
  );
}
