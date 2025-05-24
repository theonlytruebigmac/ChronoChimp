import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Interface for authenticated user session
export interface Session {
  userId: string;  // The ID of the authenticated user
  role: string;    // The user's role (Admin, Editor, etc)
  [key: string]: any;
}

// Interface for JWT payload with flexible id/userId field
export interface JWTPayload {
  id?: string;
  userId?: string;
  role?: string;
  email?: string;
  [key: string]: any;
}

/**
 * Get the authenticated user ID from either API key headers or session token
 * @param request The Next.js request object
 * @returns User ID if authenticated, null otherwise
 */
export async function getAuthUserId(request: NextRequest): Promise<string | null> {
  try {
    // First check for API key auth from middleware
    const headerUserId = request.headers.get('X-User-Id');
    const authHeader = request.headers.get('Authorization');
    
    if (headerUserId) {
      return headerUserId;
    }

    // Then check session token
    const JWT_SECRET_STRING = process.env.JWT_SECRET;
    if (!JWT_SECRET_STRING) {
      console.error("JWT_SECRET is not configured");
      return null;
    }
    
    // Get session token from request cookies
    const token = request.cookies.get('session_token')?.value;
    if (!token) {
      return null;
    }
    
    const secret = new TextEncoder().encode(JWT_SECRET_STRING);
    const { payload } = await jwtVerify(token, secret) as { payload: JWTPayload };
    const sessionUserId = payload.userId || payload.id;
    return sessionUserId || null;

  } catch (err) {
    console.error('Auth verification failed:', err);
    return null;
  }
}

export async function verify(request: NextRequest): Promise<Session | null> {
  // First check for API key auth from middleware
  const headerUserId = request.headers.get('X-User-Id');
  const headerUserRole = request.headers.get('X-User-Role');
  
  if (headerUserId && headerUserRole) {
    return {
      userId: headerUserId,
      role: headerUserRole
    };
  }
  
  // Then fall back to session token
  const token = request.cookies.get('session_token')?.value;
  
  if (!token) {
    return null;
  }
  
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    console.error('JWT_SECRET is not defined');
    return null;
  }
  
  try {
    const { payload } = await jwtVerify(
      token, 
      new TextEncoder().encode(secret)
    );
    
    // Ensure the role is included in the session
    if (!payload.role) {
      console.error('User role missing from JWT payload');
      return null;
    }
    
    return payload as Session;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// Function to get session from cookies (for API routes)
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies(); // Fix: Add await here
  const token = cookieStore.get('session_token')?.value;
  
  if (!token) {
    return null;
  }
  
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    console.error('JWT_SECRET is not defined');
    return null;
  }
  
  try {
    const { payload } = await jwtVerify(
      token, 
      new TextEncoder().encode(secret)
    );
    
    return payload as Session;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}
