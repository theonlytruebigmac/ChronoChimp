import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const SALT_ROUNDS = 10;

// Ensure JWT_SECRET is used from environment variables
const JWT_SECRET_STRING = process.env.JWT_SECRET;

async function getUserIdFromToken(): Promise<string | null> {
  if (!JWT_SECRET_STRING) {
    console.error("JWT_SECRET is not defined in environment variables. /api/me/password cannot function securely.");
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) {
    return null;
  }
  try {
    const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.userId as string;
  } catch (error) {
    console.error('JWT verification failed in /api/me/password:', error);
    return null;
  }
}

export async function PUT(request: Request) {
  if (!JWT_SECRET_STRING) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const userId = await getUserIdFromToken();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized. No session found or token invalid.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required.' }, { status: 400 });
    }
    if (newPassword.length < 6) { 
        return NextResponse.json({ error: 'New password must be at least 6 characters long.'}, { status: 400});
    }

    const userStmt = db.prepare('SELECT password FROM users WHERE id = ?');
    const user = userStmt.get(userId) as { password?: string } | undefined;

    if (!user || !user.password) {
      return NextResponse.json({ error: 'User not found or password not set up.' }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect current password.' }, { status: 403 });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    const updateStmt = db.prepare('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?');
    updateStmt.run(hashedNewPassword, new Date().toISOString(), userId);

    return NextResponse.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Failed to update password:', error);
    return NextResponse.json({ error: 'Failed to update password.' }, { status: 500 });
  }
}
