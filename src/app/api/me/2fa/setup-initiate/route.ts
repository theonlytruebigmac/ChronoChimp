import { NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// Ensure JWT_SECRET is used from environment variables
const JWT_SECRET_STRING = process.env.JWT_SECRET;

async function getJwtSecretKey(): Promise<Uint8Array> {
  if (!JWT_SECRET_STRING) {
    throw new Error("JWT_SECRET_NOT_CONFIGURED");
  }
  return Buffer.from(JWT_SECRET_STRING, 'utf-8');
}

async function getAuthenticatedUser(): Promise<{ id: string; email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) {
    return null;
  }
  try {
    const secret = await getJwtSecretKey();
    const { payload } = await jwtVerify(token, secret);
    return { id: payload.userId as string, email: payload.email as string };
  } catch (error) {
    console.error('JWT verification failed in /api/me/2fa/setup-initiate:', error);
    return null;
  }
}

export async function POST(request: Request) {
  let authenticatedUser: { id: string; email: string } | null;
  try {
    authenticatedUser = await getAuthenticatedUser();
  } catch (error: any) {
    if (error.message?.includes("JWT_SECRET_NOT_CONFIGURED")) {
      return NextResponse.json({ error: 'Server configuration error: JWT_SECRET is not set.' }, { status: 500 });
    }
    console.error('Error getting authenticated user:', error);
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 500 });
  }

  if (!authenticatedUser) {
    return NextResponse.json({ error: 'User not authenticated for 2FA setup.' }, { status: 401 });
  }

  const { id: userId, email: userEmail } = authenticatedUser;

  try {
    // We use the authenticated user's email from the JWT, no need to query DB for it here.
    const secret = authenticator.generateSecret(); // Generates a new Base32 secret
    const appName = "ChronoChimp"; // Updated app name
    const otpAuthUrl = authenticator.keyuri(userEmail, appName, secret);

    // IMPORTANT: In a real app, you would temporarily store this secret (e.g., in cache or DB associated with user)
    // and mark it as "unverified" until the user successfully verifies with an OTP.
    // For this step, we are sending the secret to the client, who will send it back for verification.
    // This is less secure for production but simplifies this demonstration.
    console.log(`[2FA Setup Initiate] User: ${userId}, Secret: ${secret}, OTPAuthURL: ${otpAuthUrl}`);

    return NextResponse.json({
      secret: secret, // For manual entry by user
      otpAuthUrl: otpAuthUrl, // For QR code generation on client
    });

  } catch (error) {
    console.error('2FA setup initiation failed:', error);
    return NextResponse.json({ error: 'Failed to initiate 2FA setup.' }, { status: 500 });
  }
}
