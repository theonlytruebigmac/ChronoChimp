import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { sendUserInviteEmail } from '@/lib/emailService';

const SALT_ROUNDS = 10;
const INVITE_EXPIRY_HOURS = 72; // 3 days

interface Params {
  params: { inviteId: string };
}

export async function POST(request: Request, { params }: Params) {
  try {
    // Fix: Access inviteId directly without destructuring
    const inviteId = params.inviteId;
    
    // Check if the invite exists
    const getInviteStmt = db.prepare('SELECT id, email, role FROM user_invites WHERE id = ? AND status = ?');
    const invite = getInviteStmt.get(inviteId, 'pending') as { id: string; email: string; role: string } | undefined;
    
    if (!invite) {
      return NextResponse.json({ error: 'Pending invite not found' }, { status: 404 });
    }
    
    // Generate a new token
    const rawToken = randomUUID();
    const hashedToken = await bcrypt.hash(rawToken, SALT_ROUNDS);
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);
    
    // Update the invite with new token and expiration
    const updateStmt = db.prepare(`
      UPDATE user_invites 
      SET token = ?, expiresAt = ? 
      WHERE id = ?
    `);
    updateStmt.run(hashedToken, expiresAt.toISOString(), inviteId);
    
    // Send the invite email
    try {
      await sendUserInviteEmail(invite.email, rawToken);
      console.log(`[INVITE RESENT] Invite resent to ${invite.email} with role ${invite.role}`);
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError);
      // We don't fail the request if email sending fails, just log it
    }
    
    return NextResponse.json({ 
      message: `Invite resent to ${invite.email} successfully.`,
      inviteUrl: process.env.NODE_ENV === 'development' ? 
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/accept-invite?token=${rawToken}` : 
        undefined
    });
  } catch (error) {
    console.error('Failed to resend invite:', error);
    return NextResponse.json({ error: 'Failed to resend invite' }, { status: 500 });
  }
}
