
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { UserRole, MockUser as User } from '@/app/admin/page';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = '1h';

// User type from DB might include isTwoFactorEnabled and twoFactorSecret
type UserFromDb = User & {
  password?: string;
  isTwoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
};

export async function POST(request: Request) {
  try {
    if (!JWT_SECRET) {
      console.error("CRITICAL: JWT_SECRET is not defined in environment variables. Authentication cannot proceed securely.");
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const stmt = db.prepare('SELECT id, name, email, password, role, avatarUrl, joinedDate, isTwoFactorEnabled, twoFactorSecret FROM users WHERE email = ?');
    const user = stmt.get(email) as UserFromDb | undefined;

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Check for 2FA
    if (user.isTwoFactorEnabled && user.twoFactorSecret) {
      return NextResponse.json({
        twoFactorRequired: true,
        userId: user.id,
        message: "Two-Factor Authentication required."
      }, { status: 200 });
    }

    const validRoles: UserRole[] = ['Admin', 'Editor', 'Viewer'];
    const userRole = validRoles.includes(user.role) ? user.role : 'Viewer';

    const { password: _dbPassword, twoFactorSecret: _dbTwoFactorSecret, ...userWithoutSensitiveData } = user;

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: userRole, name: user.name, avatarUrl: user.avatarUrl },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    // When deploying behind a reverse proxy like Traefik that handles SSL:
    // 1. Ensure `NODE_ENV` is set to `production` in your Next.js environment.
    //    This makes `secure: true` for the cookie.
    // 2. Ensure your reverse proxy (Traefik) sends the `X-Forwarded-Proto: https` header
    //    so Next.js knows the original connection was secure.
    (await cookies()).set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60, // 1 hour in seconds
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ user: userWithoutSensitiveData, message: "Login successful" });

  } catch (error) {
    console.error('Login failed:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during login. Please try again.' }, { status: 500 });
  }
}
