
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    cookies().set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: -1, // Expire the cookie immediately
      path: '/', 
      sameSite: 'lax', 
    });

    return NextResponse.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout failed:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during logout.' }, { status: 500 });
  }
}
