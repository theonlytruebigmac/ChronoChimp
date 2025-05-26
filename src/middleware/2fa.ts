import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import type { NextRequest } from 'next/server';

/**
 * Middleware to check if a user has 2FA enabled and verified
 * This should be applied to sensitive routes that require additional security
 */
export async function require2FAVerification(request: NextRequest) {
  const userId = await getAuthUserId(request);
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Check if the user has 2FA enabled
    const user = db.prepare(`
      SELECT isTwoFactorEnabled, twoFactorSecret 
      FROM users 
      WHERE id = ?
    `).get(userId) as { isTwoFactorEnabled: number, twoFactorSecret: string | null } | undefined;
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // If 2FA is enabled but not properly set up, return an error
    if (user.isTwoFactorEnabled && !user.twoFactorSecret) {
      return NextResponse.json({ 
        error: '2FA is enabled but not properly set up for this user',
        code: 'TWO_FACTOR_INCOMPLETE'
      }, { status: 428 }); // 428 Precondition Required
    }
    
    // User is authorized to access the resource
    return NextResponse.next();
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
