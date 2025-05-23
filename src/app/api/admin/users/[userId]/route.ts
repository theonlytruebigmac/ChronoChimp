import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { MockUser as User, UserRole } from '@/app/admin/page';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const SALT_ROUNDS = 10;

interface Params {
  params: { userId: string };
}

const UpdateUserSchema = z.object({
  name: z.string().min(1, "Name cannot be empty.").optional(),
  email: z.string().email("Invalid email address.").optional(),
  role: z.enum(['Admin', 'Editor', 'Viewer'] as [UserRole, ...UserRole[]]).optional(),
  password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
  avatarUrl: z.string().url("Invalid URL for avatar.").or(z.string().startsWith("data:image/", { message: "Avatar URL must be a valid URL or data URI."})).optional().nullable(),
  isTwoFactorEnabled: z.boolean().optional(),
}).partial();


export async function GET(request: Request, { params }: Params) {
  try {
    // Fix: Access userId directly without destructuring
    const userId = params.userId;
    
    const stmt = db.prepare('SELECT id, name, email, role, joinedDate, avatarUrl, isTwoFactorEnabled FROM users WHERE id = ?');
    let user = stmt.get(userId) as User | undefined;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Ensure boolean fields are correctly represented
    if (user) {
        user.isTwoFactorEnabled = !!user.isTwoFactorEnabled;
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error(`Failed to fetch user ${params.userId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    // Fix: Access userId directly without destructuring
    const userId = params.userId;
    
    const body = await request.json();

    const validationResult = UpdateUserSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const { name, email, role, password, avatarUrl, isTwoFactorEnabled } = validationResult.data;

    const selectStmt = db.prepare('SELECT id FROM users WHERE id = ?');
    const existingUser = selectStmt.get(userId) as { id: string } | undefined;

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found for update' }, { status: 404 });
    }

    const updateFields: { [key: string]: any } = {};
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email;
    if (role !== undefined) updateFields.role = role;
    if (avatarUrl !== undefined) updateFields.avatarUrl = avatarUrl;
    
    if (password && password.trim() !== '') {
      updateFields.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    if (isTwoFactorEnabled !== undefined) {
      updateFields.isTwoFactorEnabled = isTwoFactorEnabled ? 1 : 0;
      if (!isTwoFactorEnabled) { // If disabling 2FA, clear the secret
        updateFields.twoFactorSecret = null; 
      }
    }
    
    if (Object.keys(updateFields).length === 0) {
      const currentUserStmt = db.prepare('SELECT id, name, email, role, joinedDate, avatarUrl, isTwoFactorEnabled FROM users WHERE id = ?');
      let currentUserData = currentUserStmt.get(userId) as User;
      if (currentUserData) {
        currentUserData.isTwoFactorEnabled = !!currentUserData.isTwoFactorEnabled;
      }
      return NextResponse.json({ message: 'No fields to update', user: currentUserData }, { status: 200 });
    }
    
    updateFields.updatedAt = new Date().toISOString();

    const setClauses = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateFields);
    values.push(userId);

    try {
        const stmt = db.prepare(`UPDATE users SET ${setClauses} WHERE id = ?`);
        stmt.run(...values);
    } catch (dbError: any) {
      if (dbError.code === 'SQLITE_CONSTRAINT_UNIQUE' && dbError.message.includes('users.email')) {
        return NextResponse.json({ error: 'Email address already in use by another account.' }, { status: 409 });
      }
      throw dbError;
    }
    
    const updatedStmt = db.prepare('SELECT id, name, email, role, joinedDate, avatarUrl, isTwoFactorEnabled FROM users WHERE id = ?');
    let updatedUser = updatedStmt.get(userId) as User; 
    if (updatedUser) {
        updatedUser.isTwoFactorEnabled = !!updatedUser.isTwoFactorEnabled;
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error(`Failed to update user ${params.userId}:`, error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    // Fix: Access userId directly without destructuring
    const userId = params.userId;
    
    // Explicitly delete API keys associated with the user first
    const deleteApiKeysStmt = db.prepare('DELETE FROM api_keys WHERE userId = ?');
    deleteApiKeysStmt.run(userId);
    console.log(`API keys for user ${userId} have been explicitly deleted.`);

    // Then delete the user
    const deleteUserStmt = db.prepare('DELETE FROM users WHERE id = ?');
    const info = deleteUserStmt.run(userId);

    if (info.changes === 0) {
      return NextResponse.json({ error: 'User not found or already deleted' }, { status: 404 });
    }
    
    return NextResponse.json({ message: `User ${userId} and their API keys deleted successfully` });
  } catch (error) {
    console.error(`Failed to delete user ${params.userId}:`, error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
