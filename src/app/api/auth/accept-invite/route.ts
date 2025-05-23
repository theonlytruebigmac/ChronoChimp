import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const SALT_ROUNDS = 10;

export async function POST(request: Request) {
  console.log("Accept invite API endpoint called");
  
  try {
    const body = await request.json();
    const { token, name, password, email } = body;

    if (!token || !name || !password) {
      console.log("Missing required fields:", { hasToken: !!token, hasName: !!name, hasPassword: !!password });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log(`Processing invitation acceptance for token: ${token.substring(0, 8)}... and name: ${name}`);

    // Find the invite by token
    const inviteStmt = db.prepare(`
      SELECT id, email, role, token, expiresAt 
      FROM user_invites 
      WHERE status = 'pending'
    `);
    
    const invites = inviteStmt.all() as { id: string; email: string; role: string; token: string; expiresAt: string }[];
    console.log(`Found ${invites.length} pending invites to check against`);
    
    let matchedInvite = null;
    
    // Verify the token against each invite
    for (const invite of invites) {
      try {
        if (await bcrypt.compare(token, invite.token)) {
          // Check if expired
          const expiresAt = new Date(invite.expiresAt);
          if (expiresAt < new Date()) {
            console.log(`Invite ${invite.id} has expired`);
            continue;
          }
          
          matchedInvite = invite;
          break;
        }
      } catch (err) {
        console.error(`Error comparing token for invite ${invite.id}:`, err);
      }
    }
    
    if (!matchedInvite) {
      console.log("No valid invite found for token");
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
    }
    
    // Verify email matches if provided
    if (email && email !== matchedInvite.email) {
      console.log(`Email mismatch: ${email} vs ${matchedInvite.email}`);
      return NextResponse.json({ error: "Email does not match invitation" }, { status: 400 });
    }

    // Check if a user with this email already exists
    const checkUserStmt = db.prepare('SELECT id FROM users WHERE email = ?');
    const existingUser = checkUserStmt.get(matchedInvite.email);
    
    if (existingUser) {
      console.log(`User with email ${matchedInvite.email} already exists`);
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    // Create the user
    const userId = randomUUID();
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    const createUserStmt = db.prepare(`
      INSERT INTO users (id, name, email, password, role, joinedDate)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    createUserStmt.run(
      userId,
      name,
      matchedInvite.email,
      hashedPassword,
      matchedInvite.role,
      new Date().toISOString()
    );
    
    // Update the invitation status
    const updateInviteStmt = db.prepare(`
      UPDATE user_invites 
      SET status = 'accepted' 
      WHERE id = ?
    `);
    
    updateInviteStmt.run(matchedInvite.id);
    
    console.log(`User ${userId} created successfully for ${matchedInvite.email}`);
    return NextResponse.json({ success: true, message: "Account created successfully" });
    
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
