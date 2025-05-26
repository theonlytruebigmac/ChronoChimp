import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { UserRole, MockUser as User } from '@/app/admin/page';
import { getSecureCookieSettings } from '@/lib/auth-helpers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-and-long-jwt-secret-key-for-dev-env-only';
const JWT_EXPIRATION = '24h';

// Define types for our database records
interface RecoveryUser extends User {
  isTwoFactorEnabled: boolean;
}

interface BackupCode {
  id: string;
  hashedCode: string;
}

const RecoverySchema = z.object({
  userId: z.string().uuid({ message: "Invalid User ID format." }),
  backupCode: z.string().min(6, { message: "Backup code is required." }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = RecoverySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { userId, backupCode } = validationResult.data;

    // Check if the user exists and has 2FA enabled
    const userStmt = db.prepare(`
      SELECT id, name, email, role, avatarUrl, joinedDate, isTwoFactorEnabled
      FROM users 
      WHERE id = ?
    `);
    const user = userStmt.get(userId) as RecoveryUser | undefined;

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (!user.isTwoFactorEnabled) {
      return NextResponse.json({ error: '2FA is not enabled for this user.' }, { status: 400 });
    }

    // Begin transaction
    db.prepare('BEGIN TRANSACTION').run();

    try {
      // Look for valid backup codes for this user
      const backupCodesStmt = db.prepare(`
        SELECT id, hashedCode
        FROM two_factor_backup_codes
        WHERE userId = ? AND used = 0
      `);
      const backupCodes = backupCodesStmt.all(userId) as BackupCode[];

      let isValidCode = false;
      let usedCodeId = null;

      // Check if any of the backup codes match
      for (const code of backupCodes) {
        const isMatch = await bcrypt.compare(backupCode, code.hashedCode);
        if (isMatch) {
          isValidCode = true;
          usedCodeId = code.id;
          break;
        }
      }

      if (!isValidCode) {
        db.prepare('ROLLBACK').run();
        return NextResponse.json({ error: 'Invalid backup code.' }, { status: 400 });
      }

      // Mark the backup code as used
      const updateStmt = db.prepare(`
        UPDATE two_factor_backup_codes
        SET used = 1, usedAt = ?
        WHERE id = ?
      `);
      updateStmt.run(new Date().toISOString(), usedCodeId);

      // Commit the transaction
      db.prepare('COMMIT').run();

      // Create JWT token for user session
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role as UserRole, 
          name: user.name,
          twoFactorVerified: true // Add flag to indicate 2FA verification completed
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      );

      // Set the session cookie
      const cookieSettings = getSecureCookieSettings();
      (await cookies()).set('session_token', token, {
        httpOnly: true,
        secure: cookieSettings.secure,
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
        sameSite: cookieSettings.sameSite,
      });

      return NextResponse.json({ 
        success: true,
        user,
        message: "Recovery successful. Your backup code has been used." 
      });
    } catch (error) {
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('2FA recovery failed:', error);
    return NextResponse.json({ error: 'Failed to process recovery code.' }, { status: 500 });
  }
}
