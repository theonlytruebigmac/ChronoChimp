import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import type { SessionUser } from '@/app/api/auth/session/route';

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

const PROTECTED_ROUTES = ['/dashboard', '/tasks', '/settings', '/admin', '/views', '/api-docs'];
const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/accept-invite'];
const ADMIN_PAGE_ROUTES = ['/admin'];
const ADMIN_API_ROUTES = ['/api/admin'];

// For development, you can set NEXT_PUBLIC_BYPASS_AUTH=true in your .env.local file
const BYPASS_AUTH_FOR_DEV = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (BYPASS_AUTH_FOR_DEV) {
    // console.log('Auth bypass enabled for development in middleware.'); // Removed for cleaner logs
    return NextResponse.next();
  }

  let secret: Uint8Array;
  try {
    secret = await getJwtSecretKey();
  } catch (error: any) {
    if (error.message === "JWT_SECRET_NOT_CONFIGURED") {
      console.error("CRITICAL: JWT_SECRET is not defined. Middleware cannot function securely. All protected routes will be blocked or result in errors.");
      // For API routes, return JSON error. For pages, redirect.
      if (ADMIN_API_ROUTES.some(route => pathname.startsWith(route)) || pathname.startsWith('/api/me/') || pathname.startsWith('/api/tasks/')) {
         return new NextResponse(JSON.stringify({ error: 'Server configuration error: JWT_SECRET is not set.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
      }
      if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
          const loginUrl = new URL('/auth/login', request.url);
          loginUrl.searchParams.set('error', 'server_config_error');
          return NextResponse.redirect(loginUrl);
      }
      // Allow access to public routes like /auth/* if JWT_SECRET is not set, as they don't depend on it for their own function
      return NextResponse.next();
    }
    // Other errors during secret key retrieval
    console.error("Middleware: Error getting JWT secret:", error);
    if (pathname.startsWith('/api/')) {
        return new NextResponse(JSON.stringify({ error: 'Internal server error during authentication setup.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('error', 'internal_server_error');
    return NextResponse.redirect(loginUrl);
  }

  const sessionToken = request.cookies.get('session_token')?.value;

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
  const isAdminPageRoute = ADMIN_PAGE_ROUTES.some(route => pathname.startsWith(route));
  const isAdminApiRoute = ADMIN_API_ROUTES.some(route => pathname.startsWith(route));
  const isUserApiRoute = pathname.startsWith('/api/me/') || pathname.startsWith('/api/tasks/');


  if (isProtectedRoute || isAdminPageRoute || isAdminApiRoute || isUserApiRoute) {
    if (!sessionToken) {
      if (isAdminApiRoute || isUserApiRoute) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized: No session token found.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const loginUrl = new URL('/auth/login', request.url);
      if (pathname !== '/auth/login') loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    try {
      const { payload } = await jwtVerify(sessionToken, secret) as { payload: SessionUser };
      const userRole = payload.role;

      // When checking admin access, add debugging
      if (isAdminPageRoute || isAdminApiRoute) {
        if (userRole !== 'Admin') {
          console.log(`Access forbidden to ${pathname} - User role: ${userRole}, userId: ${payload.userId}`);
          
          // For API routes, return a JSON response
          if (isAdminApiRoute) {
            return new NextResponse(JSON.stringify({ 
              error: 'Forbidden: Admin access required',
              userRole: userRole // Include role in response for debugging
            }), {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          
          // For page routes, redirect with more descriptive error params
          const dashboardUrl = new URL('/dashboard', request.url);
          dashboardUrl.searchParams.set('error', 'forbidden');
          dashboardUrl.searchParams.set('reason', `Your role (${userRole}) does not have admin access`);
          return NextResponse.redirect(dashboardUrl);
        }
      }
      // If it's a user-specific API route, the presence of a valid token is enough for middleware.
      // The route handler itself will use the userId from the token.
      return NextResponse.next();
    } catch (error) {
      // console.warn('Middleware: JWT verification failed for path:', pathname, error); // Keep for debugging if needed
      const loginUrl = new URL('/auth/login', request.url);
      if (pathname !== '/auth/login') loginUrl.searchParams.set('next', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.set('session_token', '', { httpOnly: true, maxAge: -1, path: '/' });
      return response;
    }
  }

  if (isAuthRoute) {
    if (sessionToken) {
      try {
        await jwtVerify(sessionToken, secret);
        // If token is valid, user is already logged in, redirect from auth pages to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } catch (error) {
        // Token is invalid, clear it and let user proceed to auth page
        const response = NextResponse.next();
        response.cookies.set('session_token', '', { httpOnly: true, maxAge: -1, path: '/' });
        return response;
      }
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth/register|_next/static|_next/image|favicon.ico|openapi.yaml).*)',
    '/dashboard/:path*',
    '/tasks/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/views/:path*',
    '/api-docs/:path*',
    '/auth/login',
    '/auth/register', 
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/accept-invite',
    '/api/me/:path*',
    '/api/tasks/:path*',
    '/api/admin/:path*',
  ],
};
