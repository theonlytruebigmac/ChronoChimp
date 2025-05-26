import { NextRequest, NextResponse } from 'next/server';
import { parseTasksCsv } from '@/lib/csv-utils';
import { db } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Only accept multipart/form-data
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Content-Type must be multipart/form-data' }, { status: 400 });
    }

    // Authenticate user
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Read file as text
    const csvText = await file.text();
    let tasks;
    try {
      tasks = parseTasksCsv(csvText);
    } catch (err: any) {
      return NextResponse.json({ error: 'CSV parse error: ' + err.message }, { status: 400 });
    }

    // Insert tasks into DB
    const createdTasks = [];
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO tasks (id, userId, title, description, status, priority, dueDate, startDate, tags, subtasks, timeLogs, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const task of tasks) {
      const id = randomUUID();
      stmt.run(
        id,
        userId,
        task.title,
        task.description || '',
        'Backlog', // default status
        'medium', // default priority
        task.dueDate || null,
        null, // startDate
        JSON.stringify([]), // tags
        JSON.stringify([]), // subtasks
        JSON.stringify([]), // timeLogs
        '', // notes
        now,
        now
      );
      createdTasks.push(id);
    }

    return NextResponse.json({ success: true, count: createdTasks.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
