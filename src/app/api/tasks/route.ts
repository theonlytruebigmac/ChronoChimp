import { NextResponse, type NextRequest } from 'next/server';
import { db, safeJSONParse } from '@/lib/db';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import type { Task, Subtask, TimeLog, TaskStatus, TagData } from '@/components/tasks/TaskItem';
import { z } from 'zod';
import { getAuthUserId as getAuthUserIdFromLib } from '@/lib/auth';

// This endpoint needs server runtime for database access
export const runtime = 'nodejs';

const JWT_SECRET_STRING = process.env.JWT_SECRET;

interface AuthUser {
  userId: string;
  role: string;
}

async function getAuthUserId(request: NextRequest): Promise<string | null> {
  try {
    // First check for API key auth from middleware
    const headerUserId = request.headers.get('X-User-Id');
    const authHeader = request.headers.get('Authorization');
    
    console.debug('Checking API key auth:', {
      headerUserId,
      hasAuthHeader: !!authHeader,
      authHeader: authHeader ? `${authHeader.substring(0, 20)}...` : null
    });
    
    if (headerUserId) {
      console.debug('User authenticated via API key:', headerUserId);
      return headerUserId;
    }

    // Then check session token
    if (!JWT_SECRET_STRING) {
      console.error("CRITICAL: JWT_SECRET is not defined in /api/tasks.");
      return null;
    }
    
    // Get session token from request cookies
    const token = request.cookies.get('session_token')?.value;
    if (!token) {
      console.debug('No session token found in request cookies');
      return null;
    }
    
    const secret = new TextEncoder().encode(JWT_SECRET_STRING);
    const { payload } = await jwtVerify(token, secret) as { payload: { userId?: string; id?: string; } };
    const sessionUserId = payload.userId || payload.id;
    console.debug('User ID from session:', { sessionUserId, rawPayload: payload });
    return sessionUserId || null;

  } catch (err) {
    console.error('Auth verification failed in /api/tasks:', err);
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

// For creation, userId is not expected from client. It's derived from session.
const CreateTaskSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  description: z.string().optional(),
  status: z.enum(['Backlog', 'In Progress', 'Review', 'Done']).default('Backlog'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime({ message: "Invalid due date format." }).optional().nullable(),
  startDate: z.string().datetime({ message: "Invalid start date format." }).optional().nullable(),
  tags: z.array(z.object({
    text: z.string(),
    color: z.string().optional()
  })).optional().default([]),
  subtasks: z.array(SubtaskSchema.omit({ id: true })).optional().default([]),
  timeLogs: z.array(TimeLogSchema.omit({ id: true })).optional().default([]),
  notes: z.string().optional(),
});


export async function GET(request: NextRequest) {
  try {
    if (!JWT_SECRET_STRING) {
      console.error("CRITICAL: JWT_SECRET is not defined in /api/tasks GET handler");
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }
    console.debug('[Middleware] Full Request:', request);

    const userId = await getAuthUserId(request);
    if (!userId) {
      const authHeader = request.headers.get('Authorization');
      const xUserId = request.headers.get('X-User-Id');
      const sessionToken = request.cookies.get('session_token')?.value;
      
      console.error("Unauthorized access attempt to /api/tasks:", {
        hasAuthHeader: !!authHeader,
        headerUserId: xUserId,
        hasSessionCookie: !!sessionToken,
        sessionCookiePartial: sessionToken ? sessionToken.substring(0, 20) + '...' : null,
        allCookies: Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value.substring(0, 20) + '...']))
      });
      
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          details: 'This endpoint requires authentication. You can authenticate using either:\n' +
                  '1. Session token cookie (for browser requests)\n' +
                  '2. API key in Authorization header (for API requests, format: "Bearer YOUR_API_KEY")'
        },
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="ChronoChimp API"'
          }
        }
      );
    }

    const stmt = db.prepare('SELECT * FROM tasks WHERE match_uuid(userId, ?) = 1 ORDER BY createdAt DESC');
    const dbTasks = stmt.all(userId) as any[];

    console.debug(`Found ${dbTasks.length} tasks for user ${userId}`);

    const tasks: Task[] = dbTasks.map(task => {
      try {
        // Attempt to parse each JSON field separately to prevent one bad record from breaking the whole response
        const tags = safeJSONParse<TagData[] | string[]>(task.tags, []);
        const subtasks = safeJSONParse<Subtask[]>(task.subtasks, []);
        const timeLogs = safeJSONParse<TimeLog[]>(task.timeLogs, []);

        // Validate the parsed data has the expected structure
        if (!Array.isArray(tags) || !Array.isArray(subtasks) || !Array.isArray(timeLogs)) {
          console.error(`Invalid data structure for task ${task.id}`);
          return {
            ...task,
            tags: [],
            subtasks: [],
            timeLogs: [],
            dueDate: task.dueDate || undefined,
            startDate: task.startDate || undefined,
            _dataError: 'Some task data could not be parsed correctly'
          };
        }

        return {
          ...task,
          dueDate: task.dueDate || undefined,
          startDate: task.startDate || undefined,
          tags,
          subtasks,
          timeLogs,
        };
      } catch (parseError) {
        console.error(`Error parsing task data for task ${task.id}:`, parseError);
        return {
          ...task,
          tags: [],
          subtasks: [],
          timeLogs: [],
          dueDate: task.dueDate || undefined,
          startDate: task.startDate || undefined,
          _dataError: 'Task data could not be parsed'
        };
      }
    });

    return NextResponse.json(tasks, { 
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!JWT_SECRET_STRING) {
    return NextResponse.json(
      { error: 'Server configuration error.' },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const body = await request.json();
    const validationResult = CreateTaskSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input.', details: validationResult.error.flatten().fieldErrors },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
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
      userId,
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
      userId,
      title,
      description,
      status: status as TaskStatus,
      priority: priority as 'high' | 'medium' | 'low',
      dueDate: dueDate || undefined,
      startDate: startDate || undefined,
      tags,
      subtasks: processedSubtasks,
      timeLogs: processedTimeLogs,
      notes,
      createdAt: now,
      updatedAt: now,
    };
    
    return NextResponse.json(
      newTask,
      { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Failed to create task for user:', userId, error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}