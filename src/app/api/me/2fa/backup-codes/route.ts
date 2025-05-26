import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

// This endpoint needs Node.js runtime for database access and crypto
export const runtime = 'nodejs';

const BackupCodesSchema = z.object({
  regenerate: z.boolean().optional(),
});

/**
 * GET: Fetch existing backup codes (hashed preview)
 * POST: Generate new backup codes
 */
export async function GET(request: NextRequest) {
  const userId = await getAuthUserId(request);
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Check if the user has 2FA enabled
    const user = db.prepare(`
      SELECT isTwoFactorEnabled
      FROM users 
      WHERE id = ?
    `).get(userId) as { isTwoFactorEnabled: number } | undefined;
    
    if (!user || !user.isTwoFactorEnabled) {
      return NextResponse.json({ 
        error: '2FA must be enabled to manage backup codes' 
      }, { status: 400 });
    }
    
    // Check if user already has backup codes
    const backupCodes = db.prepare(`
      SELECT id, createdAt
      FROM two_factor_backup_codes
      WHERE userId = ? AND used = 0
      ORDER BY createdAt DESC
    `).all(userId) as { id: string, createdAt: string }[];
    
    return NextResponse.json({
      backupCodesExist: backupCodes.length > 0,
      count: backupCodes.length,
      generatedAt: backupCodes.length > 0 ? backupCodes[0].createdAt : null
    });
  } catch (error) {
    console.error('Error fetching 2FA backup codes status:', error);
    return NextResponse.json({ error: 'Failed to fetch backup codes status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId(request);
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const validationResult = BackupCodesSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    
    const { regenerate } = validationResult.data;
    
    // Check if the user has 2FA enabled
    const user = db.prepare(`
      SELECT isTwoFactorEnabled
      FROM users 
      WHERE id = ?
    `).get(userId) as { isTwoFactorEnabled: number } | undefined;
    
    if (!user || !user.isTwoFactorEnabled) {
      return NextResponse.json({ 
        error: '2FA must be enabled to generate backup codes' 
      }, { status: 400 });
    }
    
    // Check if user already has backup codes
    const existingCodes = db.prepare(`
      SELECT COUNT(*) as count
      FROM two_factor_backup_codes
      WHERE userId = ? AND used = 0
    `).get(userId) as { count: number };
    
    if (existingCodes.count > 0 && !regenerate) {
      return NextResponse.json({ 
        error: 'Backup codes already exist. Set regenerate: true to create new ones.' 
      }, { status: 409 });
    }
    
    // Start a transaction
    db.prepare('BEGIN TRANSACTION').run();
    
    try {
      // Delete existing backup codes if regenerating
      if (regenerate) {
        db.prepare(`
          DELETE FROM two_factor_backup_codes
          WHERE userId = ?
        `).run(userId);
      }
      
      // Generate 10 backup codes
      const backupCodes = [];
      const insertStmt = db.prepare(`
        INSERT INTO two_factor_backup_codes (id, userId, hashedCode, used, createdAt)
        VALUES (?, ?, ?, 0, ?)
      `);
      
      for (let i = 0; i < 10; i++) {
        // Generate a random 8-character code (alphanumeric)
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        const hashedCode = await bcrypt.hash(code, 10);
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        
        insertStmt.run(id, userId, hashedCode, now);
        backupCodes.push(code);
      }
      
      // Commit the transaction
      db.prepare('COMMIT').run();
      
      return NextResponse.json({
        backupCodes,
        message: 'Store these backup codes in a safe place. They will not be shown again.'
      });
    } catch (dbError) {
      // Rollback on error
      db.prepare('ROLLBACK').run();
      throw dbError;
    }
  } catch (error) {
    console.error('Error generating 2FA backup codes:', error);
    return NextResponse.json({ error: 'Failed to generate backup codes' }, { status: 500 });
  }
}
