
"use client";

import type { Task, TimeLog, Subtask } from '@/components/tasks/TaskItem'; 
import { TaskItem } from '@/components/tasks/TaskItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  // Ensure the type for taskData matches what the API expects (no id, createdAt, updatedAt)
  onUpdateTask: (taskId: string, taskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  onDeleteTask: (taskId: string) => void;
}

export function TaskList({ tasks, onUpdateTask, onDeleteTask }: TaskListProps) {
  
  const handleToggleSubtaskCompletion = (taskId: string, subtaskId: string) => {
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    const updatedSubtasks = taskToUpdate.subtasks?.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    ) || [];
    
    // Only send the subtasks field for update
    onUpdateTask(taskId, { subtasks: updatedSubtasks });
  };

  const handleLogTime = (taskId: string, newLog: TimeLog) => {
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate) return;

    const updatedTimeLogs = [...(taskToUpdate.timeLogs || []), newLog];
    // Only send the timeLogs field for update
    onUpdateTask(taskId, { timeLogs: updatedTimeLogs });
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
             <ListChecks className="h-5 w-5 text-muted-foreground" />
             Current Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No tasks yet. Add one above!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
           <ListChecks className="h-5 w-5 text-muted-foreground" />
           Current Tasks ({tasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onToggleSubtaskCompletion={handleToggleSubtaskCompletion}
              onLogTime={handleLogTime}
              onDeleteTask={onDeleteTask}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
