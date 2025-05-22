
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose'; // Ensure JWTPayload is imported if used
import type { UserRole } from '@/app/admin/page';
import type { NextRequest } from 'next/server';

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
    const cookieStore = cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ user: null, error: 'No session token found.' }, { status: 401 });
    }

    try {
      const { payload } = await jwtVerify(token, secret);

      // Ensure the payload structure matches SessionUser
      const sessionUser: SessionUser = {
        userId: payload.userId as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as UserRole,
        avatarUrl: payload.avatarUrl as string | undefined,
        // Include any other standard JWT fields if necessary, e.g., iat, exp from payload
        iat: payload.iat,
        exp: payload.exp,
      };
      return NextResponse.json({ user: sessionUser });
    } catch (error) {
      // console.warn('Session JWT verification failed:', error); // Keep for debugging if needed
      // Clear the invalid cookie
      const response = NextResponse.json({ user: null, error: 'Invalid or expired session token.' }, { status: 401 });
      response.cookies.set('session_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: -1,
        path: '/',
        sameSite: 'lax',
      });
      return response;
    }
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
