import { NextResponse, type NextRequest } from 'next/server';
import { db, safeJSONParse } from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import type { Task, Subtask, TimeLog } from '@/components/tasks/TaskItem';
import { z } from 'zod';

const JWT_SECRET_STRING = process.env.JWT_SECRET;

async function getAuthUserId(request: NextRequest): Promise<string | null> {
  if (!JWT_SECRET_STRING) {
    console.error("CRITICAL: JWT_SECRET is not defined in /api/tasks/[taskId].");
    return null; 
  }
  // Fix: Await cookies() before using get()
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) {
    return null; 
  }
  try {
    const secret = new TextEncoder().encode(JWT_SECRET_STRING);
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch (err) {
    console.error('JWT verification failed in /api/tasks/[taskId]:', err);
    return null;
  }
}

const SubtaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, { message: "Subtask title cannot be empty." }),
  completed: z.boolean(),
});

const TimeLogSchema = z.object({
  id: z.string(),
  startTime: z.string().datetime({ message: "Invalid start time format." }),
  endTime: z.string().datetime({ message: "Invalid end time format." }),
  notes: z.string().optional(),
});

const UpdateTaskSchema = z.object({
  title: z.string().min(1, { message: "Title cannot be empty." }).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['Backlog', 'In Progress', 'Review', 'Done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().datetime({ message: "Invalid due date format." }).optional().nullable(),
  startDate: z.string().datetime({ message: "Invalid start date format." }).optional().nullable(),
  tags: z.array(z.string()).optional(),
  subtasks: z.array(SubtaskSchema).optional(),
  timeLogs: z.array(TimeLogSchema).optional(),
  notes: z.string().optional().nullable(),
  // userId is not updatable by client directly
}).partial();

// Update Params type to reflect that context.params is a Promise
type RouteContext = {
  params: Promise<{ taskId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const userId = await getAuthUserId(request);
  
  if (!JWT_SECRET_STRING) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Properly await context.params before accessing its properties
    const routeParams = await context.params;
    const taskId = routeParams.taskId;
    const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    const dbTask = stmt.get(taskId) as any;

    if (!dbTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (dbTask.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden: You do not own this task' }, { status: 403 });
    }

    const task: Task = {
      ...dbTask,
      tags: safeJSONParse<string[]>(dbTask.tags, []),
      subtasks: safeJSONParse<Subtask[]>(dbTask.subtasks, []),
      timeLogs: safeJSONParse<TimeLog[]>(dbTask.timeLogs, []),
    };
    
    return NextResponse.json(task);
  } catch (error) {
    console.error(`Failed to fetch task:`, error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const authUserId = await getAuthUserId(request);
  if (!JWT_SECRET_STRING) return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  if (!authUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    // Properly await context.params before accessing its properties
    const routeParams = await context.params;
    const taskId = routeParams.taskId;
    
    const body = await request.json();

    const validationResult = UpdateTaskSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const validatedData = validationResult.data;

    const selectStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    const existingDbTask = selectStmt.get(taskId) as Task | undefined;

    if (!existingDbTask) {
      return NextResponse.json({ error: 'Task not found for update' }, { status: 404 });
    }

    if (existingDbTask.userId !== authUserId) {
        return NextResponse.json({ error: 'Forbidden: You do not own this task to update it' }, { status: 403 });
    }

    const updateFields: { [key: string]: any } = {};
    if (validatedData.title !== undefined) updateFields.title = validatedData.title;
    if (validatedData.description !== undefined) updateFields.description = validatedData.description;
    if (validatedData.status !== undefined) updateFields.status = validatedData.status;
    if (validatedData.priority !== undefined) updateFields.priority = validatedData.priority;
    if (validatedData.dueDate !== undefined) updateFields.dueDate = validatedData.dueDate;
    if (validatedData.startDate !== undefined) updateFields.startDate = validatedData.startDate;
    if (validatedData.tags !== undefined) updateFields.tags = JSON.stringify(validatedData.tags);
    if (validatedData.subtasks !== undefined) updateFields.subtasks = JSON.stringify(validatedData.subtasks);
    if (validatedData.timeLogs !== undefined) updateFields.timeLogs = JSON.stringify(validatedData.timeLogs);
    if (validatedData.notes !== undefined) updateFields.notes = validatedData.notes;
    
    if (Object.keys(updateFields).length === 0) {
      const currentTask: Task = {
        ...existingDbTask,
        tags: safeJSONParse<string[]>(existingDbTask.tags as unknown as string, []),
        subtasks: safeJSONParse<Subtask[]>(existingDbTask.subtasks as unknown as string, []),
        timeLogs: safeJSONParse<TimeLog[]>(existingDbTask.timeLogs as unknown as string, []),
      };
      return NextResponse.json(currentTask, { status: 200 });
    }
    
    updateFields.updatedAt = new Date().toISOString(); 

    const setClauses = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateFields);
    values.push(taskId); 

    const stmt = db.prepare(`UPDATE tasks SET ${setClauses} WHERE id = ?`);
    stmt.run(...values);
    
    const updatedStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    const updatedDbTask = updatedStmt.get(taskId) as any;
    
    const updatedTask: Task = {
        ...updatedDbTask,
        tags: safeJSONParse<string[]>(updatedDbTask.tags, []),
        subtasks: safeJSONParse<Subtask[]>(updatedDbTask.subtasks, []),
        timeLogs: safeJSONParse<TimeLog[]>(updatedDbTask.timeLogs, []),
    };

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error(`Failed to update task for user ${authUserId}:`, error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const authUserId = await getAuthUserId(request);
  if (!JWT_SECRET_STRING) return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  if (!authUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Properly await context.params before accessing its properties
    const routeParams = await context.params;
    const taskId = routeParams.taskId;
    
    const selectStmt = db.prepare('SELECT userId FROM tasks WHERE id = ?');
    const taskToDelete = selectStmt.get(taskId) as { userId: string } | undefined;

    if (!taskToDelete) {
      return NextResponse.json({ error: 'Task not found or already deleted' }, { status: 404 });
    }

    if (taskToDelete.userId !== authUserId) {
      return NextResponse.json({ error: 'Forbidden: You do not own this task to delete it' }, { status: 403 });
    }

    const stmt = db.prepare('DELETE FROM tasks WHERE id = ? AND userId = ?');
    const info = stmt.run(taskId, authUserId);

    if (info.changes === 0) {
      // This case should ideally be caught by the checks above, but as a fallback:
      return NextResponse.json({ error: 'Task not found or not owned by user' }, { status: 404 });
    }
    
    return NextResponse.json({ message: `Task ${taskId} deleted successfully` }, { status: 200 });
  } catch (error) {
    console.error(`Failed to delete task for user ${authUserId}:`, error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
