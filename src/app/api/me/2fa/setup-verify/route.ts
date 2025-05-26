// filepath: /home/fraziersystems/appdata/chronochimp/src/app/api/me/2fa/setup-verify/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { validateOtp } from '@/lib/2fa-utils';

// This endpoint needs Node.js runtime for database access
export const runtime = 'nodejs';

const VerifyOtpSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be 6 digits." }).regex(/^\d+$/, { message: "OTP must only contain digits." }),
  secret: z.string().min(16, { message: "Secret is required and must be at least 16 characters." }), // Typical Base32 secret length
  encryptedSecret: z.string().optional(), // The encrypted version of the secret
});

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId(request);
  
  if (!userId) {
    const authHeader = request.headers.get('Authorization');
    const xUserId = request.headers.get('X-User-Id');
    
    console.debug("Auth failure in /api/me/2fa/setup-verify:", {
      hasAuthHeader: !!authHeader,
      headerUserId: xUserId
    });
    
    return NextResponse.json(
      { 
        error: 'Unauthorized',
        details: 'This endpoint requires authentication. You can authenticate using either:\n' +
                '1. Session token cookie (for browser requests)\n' +
                '2. API key in Authorization header (for API requests, format: "Bearer YOUR_API_KEY")'
      },
      { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer realm="ChronoChimp API"'
        }
      }
    );
  }

  try {
    const body = await request.json();
    const validationResult = VerifyOtpSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { otp, secret, encryptedSecret } = validationResult.data;

    // Verify the OTP is valid for this secret
    const isValidOtp = validateOtp(otp, secret);

    if (!isValidOtp) {
      return NextResponse.json({ error: 'Invalid OTP. Please try again.' }, { status: 400 });
    }

    try {
      // Update user's 2FA settings in the database
      // Store the encrypted secret and mark 2FA as enabled
      const stmt = db.prepare('UPDATE users SET isTwoFactorEnabled = ?, twoFactorSecret = ?, updatedAt = ? WHERE id = ?');
      
      // Use the encrypted secret if provided, otherwise encrypt it now
      const secretToStore = encryptedSecret || require('@/lib/encryption').encrypt(secret);
      
      stmt.run(1, secretToStore, new Date().toISOString(), userId);

      return NextResponse.json({ 
        success: true,
        message: '2FA has been successfully enabled for your account.'
      });
    } catch (dbError) {
      console.error('Database error during 2FA setup:', dbError);
      return NextResponse.json({ error: 'Failed to enable 2FA. Database error.' }, { status: 500 });
    }
  } catch (error) {
    console.error('2FA verification failed:', error);
    return NextResponse.json({ error: 'Failed to verify 2FA setup.' }, { status: 500 });
  }
}
