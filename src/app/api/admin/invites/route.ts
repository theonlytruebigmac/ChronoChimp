'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import type { UserRole } from '@/app/admin/page';
import { sendUserInviteEmail } from '@/lib/emailService';

const SALT_ROUNDS = 10;
const INVITE_EXPIRY_HOURS = 72; // 3 days

const InviteUserSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  role: z.enum(['Admin', 'Editor', 'Viewer'] as [UserRole, ...UserRole[]]).default('Viewer'),
});

export async function POST(request: Request) {
  try {
    // TODO: Add admin authentication check here
    
    const body = await request.json();
    const validationResult = InviteUserSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email, role } = validationResult.data;

    // Check if user already exists
    const existingUserStmt = db.prepare('SELECT id FROM users WHERE email = ?');
    const existingUser = existingUserStmt.get(email);
    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email address already exists.' }, { status: 409 });
    }

    // Check for ANY invite for this email, not just pending ones
    const existingInviteStmt = db.prepare('SELECT id, status FROM user_invites WHERE email = ?');
    const existingInvite = existingInviteStmt.get(email) as { id: string, status: string } | undefined;
    
    if (existingInvite) {
      // If invite exists but is expired or accepted, update it instead of creating a new one
      if (existingInvite.status === 'expired' || existingInvite.status === 'accepted') {
        // Update the invite status to pending and generate a new token
        const rawToken = randomUUID();
        const hashedToken = await bcrypt.hash(rawToken, SALT_ROUNDS);
        
        const now = new Date();
        const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);
        
        const updateStmt = db.prepare(`
          UPDATE user_invites 
          SET token = ?, status = 'pending', expiresAt = ?, createdAt = ?
          WHERE id = ?
        `);
        updateStmt.run(hashedToken, expiresAt.toISOString(), now.toISOString(), existingInvite.id);
        
        // Send email and return success
        try {
          await sendUserInviteEmail(email, rawToken);
          console.log(`[INVITE] User invite updated and resent to ${email} with role ${role}.`);
        } catch (emailError) {
          console.error('Failed to send updated invite email:', emailError);
        }
        
        return NextResponse.json({ 
          message: `Updated and resent invite to ${email}.`,
          inviteUrl: process.env.NODE_ENV === 'development' ? 
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/accept-invite?token=${rawToken}` : 
            undefined
        }, { status: 200 });
      } else if (existingInvite.status === 'pending') {
        return NextResponse.json({ 
          error: 'An invite has already been sent to this email address.',
          inviteId: existingInvite.id
        }, { status: 409 });
      }
    }

    // Generate invite token
    const rawToken = randomUUID();
    const hashedToken = await bcrypt.hash(rawToken, SALT_ROUNDS);
    
    const inviteId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

    // Store the invite
    try {
      const stmt = db.prepare(`
        INSERT INTO user_invites (id, email, role, token, expiresAt, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(inviteId, email, role, hashedToken, expiresAt.toISOString(), 'pending', now.toISOString());
      
      // Send the invite email but don't let failure stop the process
      let emailSent = false;
      try {
        await sendUserInviteEmail(email, rawToken);
        console.log(`[INVITE] User invite sent to ${email} with role ${role}.`);
        emailSent = true;
      } catch (emailError) {
        console.error('Failed to send invite email:', emailError);
        // We continue even if email fails
      }

      return NextResponse.json({ 
        message: emailSent 
          ? `Invite sent to ${email} successfully.` 
          : `Invite created for ${email}, but email delivery failed. Check SMTP settings.`,
        inviteUrl: process.env.NODE_ENV === 'development' ? 
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/accept-invite?token=${rawToken}` : 
          undefined,
        emailSent
      }, { status: 201 });
    } catch (dbError: any) {
      // Handle database errors, especially constraint violations
      if (dbError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return NextResponse.json({ 
          error: 'An invite for this email already exists. Please try again later or resend the existing invite.' 
        }, { status: 409 });
      }
      throw dbError; // Re-throw other database errors
    }
  } catch (error) {
    console.error('Failed to send user invite:', error);
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    // TODO: Add admin authentication check here
    
    // Fetch all pending invites
    const stmt = db.prepare(`
      SELECT id, email, role, status, expiresAt, createdAt
      FROM user_invites
      WHERE status = 'pending'
      ORDER BY createdAt DESC
    `);
    
    const invites = stmt.all() as {
      id: string;
      email: string;
      role: UserRole;
      status: string;
      expiresAt: string;
      createdAt: string;
    }[];
    
    // Add isInvite flag to each invite
    const invitesWithFlag = invites.map(invite => ({
      ...invite,
      isInvite: true
    }));

    return NextResponse.json(invitesWithFlag);
  } catch (error) {
    console.error('Failed to fetch invites:', error);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

