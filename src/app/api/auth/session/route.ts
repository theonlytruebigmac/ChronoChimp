import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose'; // Ensure JWTPayload is imported if used
import type { UserRole } from '@/app/admin/page';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db'; // Add this import

const JWT_SECRET_STRING = process.env.JWT_SECRET;
let JWT_SECRET_UINT8ARRAY: Uint8Array;

async function getJwtSecretKey(): Promise<Uint8Array> {
  if (!JWT_SECRET_STRING) {
    console.error("CRITICAL: JWT_SECRET is not defined in environment variables. Session check cannot proceed securely.");
    throw new Error("JWT_SECRET_NOT_CONFIGURED");
  }
  if (!JWT_SECRET_UINT8ARRAY) {
    JWT_SECRET_UINT8ARRAY = new TextEncoder().encode(JWT_SECRET_STRING);
  }
  return JWT_SECRET_UINT8ARRAY;
}

export interface SessionUser extends JWTPayload { // Ensure SessionUser aligns with what's in the JWT
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

// Auth bypass logic removed; use environment variable NEXT_PUBLIC_BYPASS_AUTH in client components if needed for UI,
// and in middleware for route protection bypass during dev.
// The API itself should always try to be secure unless explicitly told otherwise by an env var if desired for testing.

export async function GET(request: NextRequest) {
  try {
    const secret = await getJwtSecretKey(); // This will throw if JWT_SECRET is not configured
    
    // Fix: Await the cookies() call before using it
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    // Verify and extract user info from token
    const { payload } = await jwtVerify(token, secret);
    
    // Get fresh user data from database to ensure we have the latest avatarUrl
    const userId = payload.userId as string;
    const stmt = db.prepare('SELECT id, name, email, role, avatarUrl FROM users WHERE id = ?');
    const user = stmt.get(userId) as SessionUser | undefined;
    
    if (!user) {
      // User not found in database (might have been deleted), clear the cookie
      cookieStore.delete('session_token');
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
  } catch (error: any) {
    if (error.message === "JWT_SECRET_NOT_CONFIGURED") {
      // This error is now caught by getJwtSecretKey and handled before this point,
      // but as a fallback or if logic changes:
      return NextResponse.json({ user: null, error: 'Server configuration error: JWT_SECRET is not set.' }, { status: 500 });
    }
    console.error('Session check failed:', error);
    return NextResponse.json({ user: null, error: 'An unexpected error occurred during session check.' }, { status: 500 });
  }
}
