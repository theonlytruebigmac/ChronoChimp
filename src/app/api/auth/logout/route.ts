import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSecureCookieSettings } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  try {
    // Get cookie security settings based on environment
    const cookieSettings = getSecureCookieSettings();
    
    // Create JSON response with success status
    const response = NextResponse.json({ success: true });
    
    // Set the cookie to expire
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: cookieSettings.secure,
      maxAge: -1, // Expire the cookie immediately
      path: '/',
      sameSite: cookieSettings.sameSite,
    });

    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    // Even if there's an error, redirect to login page
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}
