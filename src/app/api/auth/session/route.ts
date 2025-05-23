import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';

// Ensure JWT_SECRET is used from environment variables
const JWT_SECRET_STRING = process.env.JWT_SECRET;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ user: null });
    }

    // Verify and extract user info from token
    const secretKey = new TextEncoder().encode(JWT_SECRET_STRING);
    const { payload } = await jwtVerify(token, secretKey);
    
    // Get fresh user data from database to ensure we have the latest avatarUrl
    const userId = payload.userId as string;
    const stmt = db.prepare('SELECT id, name, email, role, avatarUrl FROM users WHERE id = ?');
    const user = stmt.get(userId) as SessionUser | undefined;
    
    if (!user) {
      // User not found in database (might have been deleted), clear the cookie
      await cookieStore.delete('session_token');
      return NextResponse.json({ user: null });
    }
    
    // Ensure avatarUrl is included correctly - handle data URIs properly
    if (user.avatarUrl && user.avatarUrl.startsWith('data:')) {
      // For data URIs, we can pass them directly without modification
      // No need to add any query parameters for cache busting
    } else if (user.avatarUrl) {
      // For regular URLs, we might want to add cache busting
      user.avatarUrl = user.avatarUrl + (user.avatarUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
    }
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Session verification failed:', error);
    return NextResponse.json({ user: null });
  }
}
