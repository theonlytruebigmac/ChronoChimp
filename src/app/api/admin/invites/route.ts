'use server';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import type { UserRole } from '@/app/admin/page';

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

    // Check if there's already a pending invite for this email
    const existingInviteStmt = db.prepare('SELECT id FROM user_invites WHERE email = ? AND status = ?');
    const existingInvite = existingInviteStmt.get(email, 'pending');
    if (existingInvite) {
      return NextResponse.json({ error: 'An invite has already been sent to this email address.' }, { status: 409 });
    }

    // Generate invite token
    const rawToken = randomUUID();
    const hashedToken = await bcrypt.hash(rawToken, SALT_ROUNDS);
    
    const inviteId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

    // Store the invite
    const stmt = db.prepare(`
      INSERT INTO user_invites (id, email, role, token, expiresAt, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(inviteId, email, role, hashedToken, expiresAt.toISOString(), 'pending', now.toISOString());

    // In a real application, you would send an email here
    // For now, we'll just log it and return success
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/accept-invite?token=${rawToken}`;
    console.log(`[INVITE] User invite sent to ${email} with role ${role}. Invite URL: ${inviteUrl}`);

    return NextResponse.json({ 
      message: `Invite sent to ${email} successfully. (Note: In development, check console for invite link)`,
      inviteUrl: process.env.NODE_ENV === 'development' ? inviteUrl : undefined
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to send user invite:', error);
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
  }
}

