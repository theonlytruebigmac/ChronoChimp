
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type { UserRole } from '@/app/admin/page';
import { z } from 'zod';

const SALT_ROUNDS = 10;

const RegisterInputSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const validationResult = RegisterInputSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMessages }, { status: 400 });
    }

    const { name, email, password } = validationResult.data;

    const existingUserStmt = db.prepare('SELECT id FROM users WHERE email = ?');
    const existingUser = existingUserStmt.get(email);

    if (existingUser) {
      return NextResponse.json({ error: 'Email address is already in use.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUserId = randomUUID();
    const now = new Date().toISOString();

    // Determine role
    const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
    const { count } = userCountStmt.get() as { count: number };
    const role: UserRole = count === 0 ? 'Admin' : 'Viewer';

    const stmt = db.prepare(`
      INSERT INTO users (id, name, email, password, role, joinedDate, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(newUserId, name, email, hashedPassword, role, now, now);

    // Do not return password or sensitive data in the response
    const newUserResponse = {
      id: newUserId,
      name,
      email,
      role: role,
      joinedDate: now,
    };
    
    return NextResponse.json(newUserResponse, { status: 201 });
  } catch (error: any) {
    console.error('Registration failed:', error);
    // Check for specific SQLite unique constraint error (though the check above should catch it)
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' && error.message.includes('users.email')) {
        return NextResponse.json({ error: 'Email address already in use.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to register user. Please try again later.' }, { status: 500 });
  }
}

