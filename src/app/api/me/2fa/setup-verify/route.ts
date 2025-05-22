import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticator } from 'otplib';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// Ensure JWT_SECRET is used from environment variables
const JWT_SECRET_STRING = process.env.JWT_SECRET;

async function getJwtSecretKey(): Promise<Uint8Array> {
  if (!JWT_SECRET_STRING) {
    throw new Error("JWT_SECRET is not defined in environment variables. /api/me/2fa/setup-verify cannot function securely.");
  }
  return new TextEncoder().encode(JWT_SECRET_STRING);
}

const VerifyOtpSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be 6 digits." }).regex(/^\d+$/, { message: "OTP must only contain digits." }),
  secret: z.string().min(16, { message: "Secret is required and must be at least 16 characters." }), // Typical Base32 secret length
});

async function getUserIdFromToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) {
    return null;
  }
  try {
    const secret = await getJwtSecretKey();
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch (error) {
    console.error('JWT verification failed in /api/me/2fa/setup-verify:', error);
    return null;
  }
}

export async function POST(request: Request) {
  let userId: string | null;
  try {
    userId = await getUserIdFromToken();
  } catch (error: any) {
    if (error.message?.includes("JWT_SECRET is not defined")) {
      return NextResponse.json({ error: 'Server configuration error: JWT_SECRET is not set.' }, { status: 500 });
    }
    console.error('Error getting user ID from token:', error);
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 500 });
  }

  if (!userId) {
    return NextResponse.json({ error: 'User not authenticated for 2FA verification.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validationResult = VerifyOtpSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { otp, secret } = validationResult.data;

    const isValidOtp = authenticator.check(otp, secret);

    if (isValidOtp) {
      // OTP is valid. Now, permanently store the secret and mark 2FA as enabled for the user.
      // TODO: In a production system, the 'secret' should be encrypted before storing in the database.
      try {
        const stmt = db.prepare('UPDATE users SET isTwoFactorEnabled = ?, twoFactorSecret = ?, updatedAt = ? WHERE id = ?');
        stmt.run(1, secret, new Date().toISOString(), userId); 
        console.log(`[2FA Setup Verify] OTP verification successful for user ${userId}. 2FA enabled and secret stored.`);
        return NextResponse.json({ message: '2FA enabled successfully.' });
      } catch (dbError) {
        console.error(`[2FA Setup Verify] Failed to update user ${userId} in DB:`, dbError);
        return NextResponse.json({ error: 'Failed to save 2FA settings. Please try again.' }, { status: 500 });
      }
    } else {
      console.log(`[2FA Setup Verify] OTP verification failed for user ${userId}.`);
      return NextResponse.json({ error: 'Invalid OTP. Please try again.' }, { status: 400 });
    }

  } catch (error) {
    console.error('2FA setup verification failed:', error);
    return NextResponse.json({ error: 'Failed to verify 2FA setup.' }, { status: 500 });
  }
}

