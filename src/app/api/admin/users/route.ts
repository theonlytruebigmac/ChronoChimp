import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import type { UserRole, MockUser as User } from '@/app/admin/page';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { getAuthUserId } from '@/lib/auth';

// This endpoint needs Node.js runtime for database and bcrypt
export const runtime = 'nodejs';

const SALT_ROUNDS = 10;

const CreateUserByAdminSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
  role: z.enum(['Admin', 'Editor', 'Viewer'] as [UserRole, ...UserRole[]]).optional().default('Viewer'),
  avatarUrl: z.string().url("Invalid URL for avatar.").or(z.string().startsWith("data:image/", { message: "Avatar URL must be a valid URL or data URI."})).optional().nullable(),
  isTwoFactorEnabled: z.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId(request);
  
  if (!userId) {
    const authHeader = request.headers.get('Authorization');
    const xUserId = request.headers.get('X-User-Id');
    
    console.debug("Auth failure in /api/admin/users:", {
      hasAuthHeader: !!authHeader,
      headerUserId: xUserId
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
  
  // TODO: Check if user has admin role

  try {
    const stmt = db.prepare('SELECT id, name, email, role, joinedDate, avatarUrl, isTwoFactorEnabled FROM users ORDER BY joinedDate DESC');
    const users = stmt.all() as User[];
    // Ensure boolean fields are correctly represented
    users.forEach(user => {
        user.isTwoFactorEnabled = !!user.isTwoFactorEnabled;
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId(request);
  
  if (!userId) {
    const authHeader = request.headers.get('Authorization');
    const xUserId = request.headers.get('X-User-Id');
    
    console.debug("Auth failure in /api/admin/users (POST):", {
      hasAuthHeader: !!authHeader,
      headerUserId: xUserId
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
  
  // TODO: Check if user has admin role

  try {
    const body = await request.json();
    const validationResult = CreateUserByAdminSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, email, password, role, avatarUrl, isTwoFactorEnabled } = validationResult.data;

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUserId = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO users (id, name, email, password, role, avatarUrl, isTwoFactorEnabled, joinedDate, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    try {
      stmt.run(newUserId, name, email, hashedPassword, role, avatarUrl, isTwoFactorEnabled ? 1 : 0, now, now);
    } catch (dbError: any) {
      if (dbError.code === 'SQLITE_CONSTRAINT_UNIQUE' && dbError.message.includes('users.email')) {
        return NextResponse.json({ error: 'Email address already in use.' }, { status: 409 });
      }
      throw dbError; // Re-throw other errors
    }

    // Fetch the newly created user to return (excluding password)
    const newUserStmt = db.prepare('SELECT id, name, email, role, avatarUrl, isTwoFactorEnabled, joinedDate FROM users WHERE id = ?');
    let newUser = newUserStmt.get(newUserId) as User;
    if (newUser) {
        newUser.isTwoFactorEnabled = !!newUser.isTwoFactorEnabled;
    }
    
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Failed to create user by admin:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

