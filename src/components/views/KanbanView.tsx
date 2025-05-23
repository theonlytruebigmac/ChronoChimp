'use client';

import React, { useState } from 'react';
import type { Task, TaskStatus } from '@/components/tasks/TaskItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
  type Active,
  type Over,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const kanbanColumns: TaskStatus[] = ['Backlog', 'In Progress', 'Review', 'Done'];

// Helper function for status badge variant, now at module scope
const getStatusBadgeVariant = (s: TaskStatus): React.ComponentProps<typeof Badge>['variant'] => {
  switch (s) {
    case 'Done': return 'default';
    case 'In Progress': return 'secondary';
    case 'Review': return 'outline';
    case 'Backlog': return 'destructive';
    default: return 'secondary';
  }
};

// Update the helper function to use available badge variants
const getPriorityBadgeVariant = (priority: string | undefined): React.ComponentProps<typeof Badge>['variant'] => {
  if (!priority) return 'outline';
  
  switch (priority.toLowerCase()) {
    case 'high': return 'destructive';
    case 'medium': return 'secondary'; // Changed from 'warning'
    case 'low': return 'default';      // Changed from 'success'
    default: return 'outline';
  }
};

interface KanbanTaskCardProps {
  task: Task;
  isDragging?: boolean;
}

function KanbanTaskCard({ task, isDragging }: KanbanTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isCurrentlyDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isCurrentlyDragging || isDragging ? 100 : undefined,
  } : undefined;

  // Helper function for priority colors
  const getPriorityColor = (priority: string | undefined): string => {
    if (!priority) return '';
    
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-500 hover:bg-red-600 text-white';
      case 'medium': return 'bg-orange-500 hover:bg-orange-600 text-white';
      case 'low': return 'bg-green-500 hover:bg-green-600 text-white';
      default: return '';
    }
  };

  return (
    <Link
      href={`/tasks/view/${task.id}`}
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "block mb-3 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md",
        (isCurrentlyDragging || isDragging) && "opacity-75 shadow-xl ring-2 ring-primary"
      )}
    >
      <Card
        className={cn(
          "bg-card hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing",
           // Keep opacity on the link for dnd-kit transform, not on the card itself unless specifically dragging
          (isCurrentlyDragging || isDragging) && "ring-1 ring-ring" // Add a subtle ring to the card itself when dragged/overlay
        )}
      >
        <CardContent className="p-3 text-sm">
          <div className="mb-1">
            <p className="font-medium pr-2">{task.title}</p>
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {task.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2 items-center justify-end">
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            {task.priority && (
              <Badge 
                className={cn("text-xs capitalize", getPriorityColor(task.priority))}
              >
                {task.priority}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
}

function KanbanColumn({ status, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div ref={setNodeRef} className="w-72 md:w-80 lg:w-96 flex-shrink-0">
      <Card className={cn("h-full shadow-md bg-muted/30", isOver && "ring-2 ring-primary shadow-xl")}>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            {status}
            <Badge variant={getStatusBadgeVariant(status)} className="ml-2 text-xs">
              {tasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-0 min-h-[200px]">
          {tasks.length > 0 ? (
            tasks.map((task) => <KanbanTaskCard key={task.id} task={task} />)
          ) : (
            <p className="text-sm text-muted-foreground text-center pt-4">No tasks in this status.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface KanbanViewProps {
  tasks: Task[];
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

export function KanbanView({ tasks, onTaskStatusChange }: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveTask(null);

    if (over && active.id !== over.id) { // Ensure it's dropped on a droppable and it's a column
      const taskId = active.id as string;
      const newStatus = over.id as TaskStatus;

      const draggedTask = tasks.find(t => t.id === taskId);

      if (draggedTask && draggedTask.status !== newStatus) {
        onTaskStatusChange(taskId, newStatus);
        toast({
          title: "Task Status Updated",
          description: `Task "${draggedTask.title}" moved to ${newStatus}.`
        });
      }
    }
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {kanbanColumns.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={getTasksByStatus(status)}
            />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeId && activeTask ? (
          <KanbanTaskCard task={activeTask} isDragging={true} />
        ) : null}
      </DragOverlay>
      <p className="mt-4 text-sm text-muted-foreground">
        Drag and drop tasks between columns to change their status.
      </p>
    </DndContext>
  );
}
