import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import type { SessionUser } from '@/app/api/auth/session/route';

interface JWTPayload {
  id?: string;
  userId?: string;
  name: string;
  email: string;
  role: string | undefined;
  twoFactorVerified?: boolean;
  iat?: number;
  exp?: number;
}

const JWT_SECRET_STRING = process.env.JWT_SECRET;
let JWT_SECRET_UINT8ARRAY: Uint8Array;

async function getJwtSecretKey(): Promise<Uint8Array> {
  if (!JWT_SECRET_STRING) {
    console.error("CRITICAL: JWT_SECRET is not defined in environment variables. Middleware cannot function securely.");
    throw new Error("JWT_SECRET_NOT_CONFIGURED");
  }
  if (!JWT_SECRET_UINT8ARRAY) {
    JWT_SECRET_UINT8ARRAY = new TextEncoder().encode(JWT_SECRET_STRING);
  }
  return JWT_SECRET_UINT8ARRAY;
}

// Check if we're behind a proxy
const TRUST_PROXY = process.env.NEXT_PUBLIC_TRUST_PROXY === 'true';

// Get the real client IP when behind a proxy like Traefik
function getClientIP(request: NextRequest): string {
  if (TRUST_PROXY) {
    // When behind a proxy, use X-Forwarded-For header
    const forwardedFor = request.headers.get('X-Forwarded-For');
    if (forwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return forwardedFor.split(',')[0].trim();
    }
  }
  // Fall back to connection info (available in certain environments)
  return 'unknown';
}

// Configure secure cookie settings based on environment
function getSecureCookieSettings(): { secure: boolean; sameSite: 'strict' | 'lax' | 'none' } {
  const allowHttpCookies = process.env.NEXT_PUBLIC_ALLOW_HTTP_COOKIES === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // In production, always use secure cookies unless explicitly disabled
  // In development, allow non-secure cookies for local testing
  return {
    secure: isProduction || !allowHttpCookies,
    sameSite: isProduction ? 'strict' : 'lax'
  };
}

// Get the protocol (http/https) accounting for proxies
function getProtocol(request: NextRequest): string {
  if (TRUST_PROXY) {
    // When behind a proxy, use X-Forwarded-Proto header
    const forwardedProto = request.headers.get('X-Forwarded-Proto');
    if (forwardedProto) {
      return forwardedProto.trim().toLowerCase();
    }
  }
  // Fall back to URL protocol
  return request.nextUrl.protocol.replace(':', '');
}

// Get the host accounting for proxies
function getHost(request: NextRequest): string {
  if (TRUST_PROXY) {
    // When behind a proxy, use X-Forwarded-Host header
    const forwardedHost = request.headers.get('X-Forwarded-Host');
    if (forwardedHost) {
      return forwardedHost.trim().toLowerCase();
    }
  }
  // Fall back to URL host
  return request.nextUrl.host;
}

const PROTECTED_ROUTES = ['/dashboard', '/tasks', '/settings', '/admin', '/views', '/api-docs'];
const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/accept-invite'];
const ADMIN_PAGE_ROUTES = ['/admin'];
const ADMIN_API_ROUTES = ['/api/admin'];
const API_ROUTES = ['/api/tasks', '/api/me'];

// For development, you can set NEXT_PUBLIC_BYPASS_AUTH=true in your .env.local file
const BYPASS_AUTH_FOR_DEV = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

async function validateApiKey(request: NextRequest): Promise<{ userId: string; role: string } | null> {
  console.debug('[Middleware] Starting API key validation');
  
  const authHeader = request.headers.get('Authorization')?.trim();
  if (!authHeader) {
    console.debug('[Middleware] No Authorization header present');
    return null;
  }

  // Case-insensitive check for "bearer" prefix and normalize
  const match = authHeader.match(/^bearer\s+(.+)$/i);
  if (!match) {
    console.debug('[Middleware] Authorization header does not match Bearer token format:', authHeader);
    return null;
  }

  const token = match[1].trim();
  if (!token) {
    console.debug('[Middleware] Empty token in Authorization header');
    return null;
  }

  try {
    // Construct absolute URL for validation
    const protocol = getProtocol(request);
    const host = getHost(request);
    
    // Create validation URL using protocol and host to preserve settings behind proxy
    const baseUrl = `${protocol}://${host}`;
    const validationUrl = new URL('/api/auth/validate-key/edge', baseUrl);
    
    console.debug('[Middleware] Validating API key at:', validationUrl.toString());

    const validationResponse = await fetch(validationUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        // Forward original headers for proper context
        'X-Forwarded-For': request.headers.get('X-Forwarded-For') || '',
        'X-Forwarded-Proto': request.headers.get('X-Forwarded-Proto') || '',
        'X-Forwarded-Host': request.headers.get('X-Forwarded-Host') || ''
      }
    });

    const data = await validationResponse.json();
    console.debug('[Middleware] Validation response:', {
      status: validationResponse.status,
      data: data
    });

    if (!validationResponse.ok) {
      console.debug('[Middleware] API key validation failed:', data.error);
      return null;
    }

    if (!data.userId || !data.role) {
      console.debug('[Middleware] Invalid validation response:', data);
      return null;
    }

    console.debug('[Middleware] API key validated successfully for user:', data.userId);
    return {
      userId: data.userId,
      role: data.role
    };

  } catch (error) {
    console.error('[Middleware] Error validating API key:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  console.debug('[Middleware] Request:', {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    protocol: getProtocol(request),
    host: getHost(request),
    clientIP: getClientIP(request)
  });

  const isAdminApiRoute = request.nextUrl.pathname.startsWith('/api/admin/');
  const isUserApiRoute = request.nextUrl.pathname.startsWith('/api/tasks') || 
                        request.nextUrl.pathname.startsWith('/api/me/');

  // For API routes, try API key first
  if (isAdminApiRoute || isUserApiRoute) {
    const apiKeyValidation = await validateApiKey(request);
    if (apiKeyValidation) {
      console.debug('[Middleware] API key validated successfully:', apiKeyValidation);
      
      // Create a new response that clones the incoming request
      const response = NextResponse.next();
      
      // Set user info headers from API key validation
      response.headers.set('X-User-Id', apiKeyValidation.userId);
      response.headers.set('X-User-Role', apiKeyValidation.role);
      
      // Forward the original Authorization header
      const authHeader = request.headers.get('Authorization');
      if (authHeader) {
        response.headers.set('Authorization', authHeader);
      }
      
      // Add proxy-related headers if using a reverse proxy
      if (TRUST_PROXY) {
        // Forward proxy-related headers
        for (const header of ['X-Forwarded-For', 'X-Forwarded-Proto', 'X-Forwarded-Host']) {
          const value = request.headers.get(header);
          if (value) {
            response.headers.set(header, value);
          }
        }
      }
      
      console.debug('[Middleware] Forwarding with headers:', {
        headers: Object.fromEntries(response.headers.entries())
      });
      
      return response;
    } else {
      console.debug('[Middleware] API key validation failed, falling back to session');
    }
  }

  // Fall back to session token validation
  const sessionToken = request.cookies.get('session_token')?.value;
  console.debug('[Middleware] Cookies:', {
    all: request.cookies.getAll(),
    sessionToken: sessionToken?.substring(0, 20) + '...'
  });

  if (sessionToken) {
    try {
      if (!JWT_SECRET_STRING) {
        throw new Error("JWT_SECRET_NOT_CONFIGURED");
      }
      const secret = new TextEncoder().encode(JWT_SECRET_STRING);
      const { payload } = await jwtVerify(sessionToken, secret) as { payload: JWTPayload };
      
      console.debug('[Middleware] Session payload:', {
        userId: payload.userId || payload.id,
        role: payload.role,
        twoFactorVerified: payload.twoFactorVerified,
        rawPayload: payload
      });
      
      // Get actual userId from either userId or id field (depending on token format)
      const userId = payload.userId || payload.id;
      
      // Create response with session user info
      const response = NextResponse.next();
      
      if (userId) {
        response.headers.set('X-User-Id', userId);
      }
      
      if (payload.role) {
        response.headers.set('X-User-Role', payload.role);
      }
      
      // Add 2FA verification status to headers
      if (payload.twoFactorVerified) {
        response.headers.set('X-2FA-Verified', 'true');
      }
      
      // For /api/me/* and /settings routes, check if 2FA verification is needed
      const requires2FA = request.nextUrl.pathname.startsWith('/api/me/') || 
                         request.nextUrl.pathname.startsWith('/settings');
      
      // If this is a route that requires 2FA and user has 2FA enabled but not verified
      // redirect to login page to complete 2FA
      if (requires2FA && payload.twoFactorVerified === false) {
        console.debug('[Middleware] User requires 2FA verification for this route');
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname);
        loginUrl.searchParams.set('require2fa', 'true');
        return NextResponse.redirect(loginUrl);
      }
      
      return response;
      
    } catch (error) {
      console.error('[Middleware] Session validation failed:', error);
      // Continue without setting headers - the API will handle unauthorized access
    }
  }

  const pathname = request.nextUrl.pathname;
  
  // If this is a protected route and user is not authenticated, redirect to login
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    // Skip auth check for API routes as they handle their own auth
    if (!pathname.startsWith('/api/')) {
      // No valid session or API key found, redirect to login
      const loginUrl = new URL('/auth/login', request.url);
      // Add the return URL as a query parameter
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Allow the request to continue for non-protected routes or API routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except Next.js system paths and static assets
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|openapi.yaml).*)',
    // Include /api/auth/validate-key explicitly since we need to process it
    '/api/auth/validate-key/:path*',
    // Protected routes
    '/dashboard/:path*',
    '/tasks/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/views/:path*',
    '/api-docs/:path*',
    // Auth routes
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/accept-invite',
    // Protected API routes
    '/api/me/:path*',
    '/api/tasks/:path*',
    '/api/admin/:path*',
  ],
};
