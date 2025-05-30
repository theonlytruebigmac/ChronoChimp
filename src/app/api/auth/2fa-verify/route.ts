
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { UserRole, MockUser as User } from '@/app/admin/page';
import { getSecureCookieSettings } from '@/lib/auth-helpers';
import { validateOtp } from '@/lib/2fa-utils';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-and-long-jwt-secret-key-for-dev-env-only';
const JWT_EXPIRATION = '24h';

const Verify2FASchema = z.object({
  userId: z.string().uuid({ message: "Invalid User ID format." }),
  otp: z.string().length(6, { message: "OTP must be 6 digits." }).regex(/^\d+$/, { message: "OTP must only contain digits." }),
});

type UserFromDb = User & {
  isTwoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = Verify2FASchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { userId, otp } = validationResult.data;

    const userStmt = db.prepare('SELECT id, name, email, role, avatarUrl, joinedDate, isTwoFactorEnabled, twoFactorSecret FROM users WHERE id = ?');
    const user = userStmt.get(userId) as UserFromDb | undefined;

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ error: '2FA is not enabled for this user or secret is missing.' }, { status: 400 });
    }

    const isValidOtp = validateOtp(otp, user.twoFactorSecret);

    if (!isValidOtp) {
      return NextResponse.json({ error: 'Invalid OTP. Please try again.' }, { status: 400 });
    }

    // OTP is valid, now issue the full session token
    const validRoles: UserRole[] = ['Admin', 'Editor', 'Viewer'];
    const userRole = validRoles.includes(user.role) ? user.role : 'Viewer';
    
    // Exclude sensitive data from JWT payload and response
    const { twoFactorSecret: _, ...userWithoutSensitiveData } = user;


    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: userRole, 
        name: user.name,
        twoFactorVerified: true // Add flag to indicate 2FA verification completed
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    // Get cookie security settings based on environment
    const cookieSettings = getSecureCookieSettings();
    
    (await cookies()).set('session_token', token, {
      httpOnly: true,
      secure: cookieSettings.secure,
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
      sameSite: cookieSettings.sameSite,
    });

    return NextResponse.json({ user: userWithoutSensitiveData, message: "2FA verification successful. Login complete." });

  } catch (error) {
    console.error('2FA verification failed:', error);
    return NextResponse.json({ error: 'Failed to verify 2FA code.' }, { status: 500 });
  }
}

