import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';

// This endpoint needs Node.js runtime for database and bcrypt
export const runtime = 'nodejs';

const SALT_ROUNDS = 10; // For hashing the new password and comparing token

const ResetPasswordInputSchema = z.object({
  token: z.string().min(1, { message: "Reset token is required." }),
  newPassword: z.string().min(6, { message: "Password must be at least 6 characters long." }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = ResetPasswordInputSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { token: rawToken, newPassword } = validationResult.data;

    // Find token record by hashing the rawToken and comparing
    // It's inefficient to query all tokens, ideally we'd have a way to query by hashed token
    // but bcrypt hashes are not reversible.
    // A better approach for lookup would be to also store a shorter, non-sensitive part of the raw token, or use a different token strategy.
    // For simplicity here, we'll fetch all non-expired tokens and compare.
    const now = new Date().toISOString();
    const potentialTokensStmt = db.prepare('SELECT id, userId, token as hashedTokenInDb, expiresAt FROM password_reset_tokens WHERE expiresAt > ?');
    const potentialTokens = potentialTokensStmt.all(now) as { id: string; userId: string; hashedTokenInDb: string; expiresAt: string }[];
    
    let tokenRecord = null;
    for (const pt of potentialTokens) {
        const isMatch = await bcrypt.compare(rawToken, pt.hashedTokenInDb);
        if (isMatch) {
            tokenRecord = pt;
            break;
        }
    }

    if (!tokenRecord) {
      return NextResponse.json({ error: 'Invalid or expired password reset token.' }, { status: 400 });
    }

    // Token is valid and not expired, proceed to update password
    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    const updateUserStmt = db.prepare('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?');
    const updateInfo = updateUserStmt.run(hashedNewPassword, new Date().toISOString(), tokenRecord.userId);

    if (updateInfo.changes === 0) {
      // Should not happen if tokenRecord.userId is valid
      return NextResponse.json({ error: 'Failed to update password for the user.' }, { status: 500 });
    }

    // Delete the used token
    const deleteTokenStmt = db.prepare('DELETE FROM password_reset_tokens WHERE id = ?');
    deleteTokenStmt.run(tokenRecord.id);

    return NextResponse.json({ message: 'Your password has been successfully reset.' });

  } catch (error) {
    console.error('Reset password failed:', error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again later.' }, { status: 500 });
  }
}

