
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';
import { z } from 'zod';

interface Params {
  params: { token: string };
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { token: rawToken } = params;

    if (!rawToken || typeof rawToken !== 'string') {
      return NextResponse.json({ error: 'Invite token is required.' }, { status: 400 });
    }

    // We need to find the invite by hashing the rawToken and comparing it to stored hashed tokens.
    // This is not the most efficient way if there are many tokens, but it's secure.
    // A more optimized approach might involve a secondary lookup key if performance becomes an issue.
    const allInvitesStmt = db.prepare('SELECT id, email, role, token as hashedTokenInDb, expiresAt, status FROM user_invites WHERE status = ?');
    const pendingInvites = allInvitesStmt.all('pending') as { id: string; email: string; role: string; hashedTokenInDb: string; expiresAt: string; status: string }[];

    let foundInvite = null;
    for (const invite of pendingInvites) {
      const isMatch = await bcrypt.compare(rawToken, invite.hashedTokenInDb);
      if (isMatch) {
        foundInvite = invite;
        break;
      }
    }

    if (!foundInvite) {
      return NextResponse.json({ error: 'Invalid or expired invite token.' }, { status: 404 });
    }

    const now = new Date();
    const expiresAtDate = new Date(foundInvite.expiresAt);
    if (now > expiresAtDate) {
      // Optionally, update status to 'expired' here
      const expireStmt = db.prepare('UPDATE user_invites SET status = ? WHERE id = ?');
      expireStmt.run('expired', foundInvite.id);
      return NextResponse.json({ error: 'Invite token has expired.' }, { status: 400 });
    }

    // Return only necessary info
    return NextResponse.json({ email: foundInvite.email, role: foundInvite.role });

  } catch (error) {
    console.error('Failed to validate invite token:', error);
    return NextResponse.json({ error: 'Failed to validate invite token.' }, { status: 500 });
  }
}
