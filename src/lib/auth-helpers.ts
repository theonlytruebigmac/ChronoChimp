import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// This helper exists in Edge Runtime and extracts auth info from headers/cookies
export async function getAuthInfo(request: NextRequest) {
  // Check API key first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const apiKey = authHeader.substring(7);
    return {
      type: 'apiKey',
      key: apiKey
    };
  }

  // Check session token
  const sessionToken = request.cookies.get('session_token')?.value;
  if (sessionToken) {
    return {
      type: 'session',
      token: sessionToken
    };
  }

  return null;
}

/**
 * Configure secure cookie settings based on environment
 * @returns Cookie security settings object
 */
export function getSecureCookieSettings(): { secure: boolean; sameSite: 'strict' | 'lax' | 'none' } {
  const allowHttpCookies = process.env.NEXT_PUBLIC_ALLOW_HTTP_COOKIES === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  const isBehindProxy = process.env.NEXT_PUBLIC_TRUST_PROXY === 'true';
  
  // In production, always use secure cookies unless explicitly disabled
  // In development, allow non-secure cookies for local testing
  return {
    secure: (isProduction || isBehindProxy) && !allowHttpCookies,
    sameSite: isProduction ? 'strict' : 'lax'
  };
}
