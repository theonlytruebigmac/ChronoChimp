import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';
import { getAuthUserId } from '@/lib/auth';

const SALT_ROUNDS = 10;

export async function PUT(request: NextRequest) {
  const userId = await getAuthUserId(request);
  
  if (!userId) {
    const authHeader = request.headers.get('Authorization');
    const xUserId = request.headers.get('X-User-Id');
    
    console.debug("Auth failure in /api/me/password:", {
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
