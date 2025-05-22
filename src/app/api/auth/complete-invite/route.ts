
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import type { UserRole } from '@/app/admin/page';

const SALT_ROUNDS = 10;

const CompleteInviteSchema = z.object({
  token: z.string().min(1, { message: "Invite token is required." }),
  name: z.string().min(1, { message: "Name is required." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = CompleteInviteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { token: rawToken, name, password } = validationResult.data;

    // Find the invite by hashing the rawToken
    const allInvitesStmt = db.prepare('SELECT id, email, role, token as hashedTokenInDb, expiresAt, status FROM user_invites WHERE status = ?');
    const pendingInvites = allInvitesStmt.all('pending') as { id: string; email: string; role: UserRole; hashedTokenInDb: string; expiresAt: string; status: string }[];
    
    let inviteRecord = null;
    for (const invite of pendingInvites) {
        const isMatch = await bcrypt.compare(rawToken, invite.hashedTokenInDb);
        if (isMatch) {
            inviteRecord = invite;
            break;
        }
    }

    if (!inviteRecord) {
      return NextResponse.json({ error: 'Invalid or expired invite token.' }, { status: 400 });
    }

    const now = new Date();
    const expiresAtDate = new Date(inviteRecord.expiresAt);
    if (now > expiresAtDate) {
      // Optionally update status to 'expired'
      const expireStmt = db.prepare('UPDATE user_invites SET status = ? WHERE id = ?');
      expireStmt.run('expired', inviteRecord.id);
      return NextResponse.json({ error: 'Invite token has expired.' }, { status: 400 });
    }

    // Check if email is already registered
    const existingUserStmt = db.prepare('SELECT id FROM users WHERE email = ?');
    const existingUser = existingUserStmt.get(inviteRecord.email);
    if (existingUser) {
      // Mark invite as used (or handle differently if email conflict is unexpected)
      const conflictStmt = db.prepare('UPDATE user_invites SET status = ? WHERE id = ?');
      conflictStmt.run('accepted_email_conflict', inviteRecord.id); // Or some other status
      return NextResponse.json({ error: 'Email address is already registered. Please log in or use password reset.' }, { status: 409 });
    }

    // Create the new user
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUserId = randomUUID();
    const joinedDate = new Date().toISOString();

    const createUserStmt = db.prepare(`
      INSERT INTO users (id, name, email, password, role, joinedDate, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    createUserStmt.run(newUserId, name, inviteRecord.email, hashedPassword, inviteRecord.role, joinedDate, joinedDate);

    // Update the invite status to 'accepted'
    const updateInviteStmt = db.prepare('UPDATE user_invites SET status = ? WHERE id = ?');
    updateInviteStmt.run('accepted', inviteRecord.id);

    // Return a success message (user is not automatically logged in here)
    return NextResponse.json({ message: 'Registration successful! You can now log in.' }, { status: 201 });

  } catch (error) {
    console.error('Failed to complete invite registration:', error);
    return NextResponse.json({ error: 'Failed to complete registration.' }, { status: 500 });
  }
}
