import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { generate2FASecret } from '@/lib/2fa-utils';

// This endpoint needs Node.js runtime for database access
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId(request);
  
  if (!userId) {
    const authHeader = request.headers.get('Authorization');
    const xUserId = request.headers.get('X-User-Id');
    
    console.debug("Auth failure in /api/me/2fa/setup-initiate:", {
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
  
  // Get the user's email from the database
  const userStmt = db.prepare('SELECT email FROM users WHERE id = ?');
  const user = userStmt.get(userId) as { email: string } | undefined;
  
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  const userEmail = user.email;

  try {
    // Generate a new secret for 2FA
    const { secret, encryptedSecret, otpAuthUrl } = generate2FASecret(userEmail);

    // IMPORTANT: In a real app, you would temporarily store this secret (e.g., in cache or DB associated with user)
    // and mark it as "unverified" until the user successfully verifies with an OTP.
    // For this step, we are sending the secret to the client, who will send it back for verification.
    // This is less secure for production but simplifies this demonstration.
    console.log(`[2FA Setup Initiate] User: ${userId}, Secret: ${secret}, OTPAuthURL: ${otpAuthUrl}`);

    return NextResponse.json({
      secret: secret, // For manual entry by user
      encryptedSecret: encryptedSecret, // This will be stored in the database
      otpAuthUrl: otpAuthUrl, // For QR code generation on client
    });

  } catch (error) {
    console.error('2FA setup initiation failed:', error);
    return NextResponse.json({ error: 'Failed to initiate 2FA setup.' }, { status: 500 });
  }
}
