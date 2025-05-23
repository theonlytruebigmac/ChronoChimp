import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Update to include the user's role in the session
export interface Session {
  userId: string;
  role: string;
  [key: string]: any;
}

export async function verify(request: NextRequest): Promise<Session | null> {
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
