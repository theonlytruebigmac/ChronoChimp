import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';

export async function GET(request: Request) {
  try {
    // Get token from query params
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'No token provided' }, { status: 400 });
    }

    // Find the invite by matching against the raw token
    // This requires comparing the provided token against each stored hash
    const stmt = db.prepare(`SELECT id, email, role, token, expiresAt, status FROM user_invites WHERE status = 'pending'`);
    const invites = stmt.all() as { id: string; email: string; role: string; token: string; expiresAt: string; status: string }[];

    // Add debug log to see how many pending invites we have
    console.log(`Found ${invites.length} pending invites to check against`);
    
    // Check each invite to see if the token matches
    for (const invite of invites) {
      try {
        // Check if the token has expired
        const expiresAt = new Date(invite.expiresAt);
        const now = new Date();
        
        if (expiresAt < now) {
          console.log(`Invite ${invite.id} has expired. Expiry: ${invite.expiresAt}`);
          continue; // Skip expired invites
        }
        
        // Attempt to verify using bcrypt
        if (await bcrypt.compare(token, invite.token)) {
          console.log(`Token verified for invite id ${invite.id}, email ${invite.email}`);
          
          return NextResponse.json({
            valid: true,
            email: invite.email,
            role: invite.role
          });
        }
      } catch (err) {
        console.error(`Error checking invite ${invite.id}:`, err);
        // Continue to next invite
      }
    }

    // If we get here, no valid invite was found for the token
    console.log('No valid invite found for token');
    return NextResponse.json({ valid: false, error: 'Invalid or expired invitation' }, { status: 404 });
  } catch (error) {
    console.error('Error verifying invite:', error);
    return NextResponse.json({ valid: false, error: 'Failed to verify invitation' }, { status: 500 });
  }
}
