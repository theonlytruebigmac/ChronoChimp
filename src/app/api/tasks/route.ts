
import { NextResponse, type NextRequest } from 'next/server';
import { db, safeJSONParse } from '@/lib/db';
import { randomUUID } from 'crypto';
import type { Task, Subtask, TimeLog, TaskStatus } from '@/components/tasks/TaskItem';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET_STRING = process.env.JWT_SECRET;

async function getAuthUserId(request: NextRequest): Promise<string | null> {
  if (!JWT_SECRET_STRING) {
    console.error("CRITICAL: JWT_SECRET is not defined in /api/tasks.");
    return null; // Indicates server configuration error
  }
  const token = cookies().get('session_token')?.value;
  if (!token) {
    return null; // No token, so unauthorized
  }
  try {
    const secret = new TextEncoder().encode(JWT_SECRET_STRING);
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch (err) {
    console.error('JWT verification failed in /api/tasks:', err);
    return null; // Token invalid
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

// For creation, userId is not expected from client. It's derived from session.
const CreateTaskSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  description: z.string().optional(),
  status: z.enum(['Backlog', 'In Progress', 'Review', 'Done']).default('Backlog'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime({ message: "Invalid due date format." }).optional().nullable(),
  startDate: z.string().datetime({ message: "Invalid start date format." }).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  subtasks: z.array(SubtaskSchema.omit({ id: true })).optional().default([]),
  timeLogs: z.array(TimeLogSchema.omit({ id: true })).optional().default([]),
  notes: z.string().optional(),
});


export async function GET(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!JWT_SECRET_STRING) return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const stmt = db.prepare('SELECT * FROM tasks WHERE userId = ? ORDER BY createdAt DESC');
    const dbTasks = stmt.all(userId) as any[];

    const tasks: Task[] = dbTasks.map(task => ({
      ...task,
      tags: safeJSONParse<string[]>(task.tags, []),
      subtasks: safeJSONParse<Subtask[]>(task.subtasks, []),
      timeLogs: safeJSONParse<TimeLog[]>(task.timeLogs, []),
    }));
    
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Failed to fetch tasks for user:', userId, error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!JWT_SECRET_STRING) return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const validationResult = CreateTaskSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { 
      title, 
      description, 
      status, 
      priority, 
      dueDate, 
      startDate, 
      tags, 
      subtasks,
      timeLogs,
      notes 
    } = validationResult.data;

    const newTaskId = randomUUID();
    const now = new Date().toISOString();

    const processedSubtasks = subtasks.map(st => ({ ...st, id: randomUUID() }));
    const processedTimeLogs = timeLogs.map(tl => ({ ...tl, id: randomUUID() }));

    const stmt = db.prepare(`
      INSERT INTO tasks (id, userId, title, description, status, priority, dueDate, startDate, tags, subtasks, timeLogs, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      newTaskId,
      userId, // Store the authenticated user's ID
      title,
      description,
      status,
      priority,
      dueDate,
      startDate,
      JSON.stringify(tags),
      JSON.stringify(processedSubtasks),
      JSON.stringify(processedTimeLogs),
      notes,
      now,
      now
    );

    const newTask: Task = {
      id: newTaskId,
      userId, // Include userId in the returned task
      title,
      description,
      status: status as TaskStatus,
      priority: priority as 'high' | 'medium' | 'low',
      dueDate,
      startDate,
      tags,
      subtasks: processedSubtasks,
      timeLogs: processedTimeLogs,
      notes,
      createdAt: now,
      updatedAt: now,
    };
    
    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('Failed to create task for user:', userId, error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
