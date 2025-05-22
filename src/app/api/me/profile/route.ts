
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { MockUser as User, UserRole } from '@/app/admin/page';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// Ensure JWT_SECRET is used from environment variables
const JWT_SECRET_STRING = process.env.JWT_SECRET;
let JWT_SECRET_UINT8ARRAY: Uint8Array;

async function getJwtSecretKey() {
  if (!JWT_SECRET_UINT8ARRAY) {
    if (!JWT_SECRET_STRING) {
        throw new Error("JWT_SECRET is not defined in environment variables.");
    }
    JWT_SECRET_UINT8ARRAY = new TextEncoder().encode(JWT_SECRET_STRING);
  }
  return JWT_SECRET_UINT8ARRAY;
}

async function getUserIdFromToken(request: Request): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) {
    return null;
  }
  try {
    const secret = await getJwtSecretKey();
    const { payload } = await jwtVerify(token, secret);
    return payload.userId as string;
  } catch (error) {
    console.error('JWT verification failed in /api/me/profile:', error);
    return null;
  }
}

// Augment User type to include notification preferences, 2FA, and SMTP settings
type UserWithPreferencesAndSettings = User & {
  emailNotificationsEnabled?: boolean;
  inAppNotificationsEnabled?: boolean;
  isTwoFactorEnabled?: boolean;
  twoFactorSecret?: string | null; 
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpEncryption?: string | null;
  smtpUsername?: string | null;
  smtpPassword?: string | null; 
  smtpSendFrom?: string | null;
};

const UpdateProfileSchema = z.object({
  name: z.string().min(1, { message: "Name cannot be empty." }).optional(),
  email: z.string().email({ message: "Invalid email address." }).optional(),
  avatarUrl: z.string().url({ message: "Invalid URL for avatar." }).or(z.string().startsWith("data:image/", { message: "Avatar URL must be a valid URL or data URI."})).optional().nullable(),
  emailNotificationsEnabled: z.boolean().optional(),
  inAppNotificationsEnabled: z.boolean().optional(),
  isTwoFactorEnabled: z.boolean().optional(),
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.number().int().positive().optional().nullable(),
  smtpEncryption: z.enum(['none', 'ssl', 'starttls']).optional().nullable(),
  smtpUsername: z.string().optional().nullable(),
  smtpPassword: z.string().optional().nullable(),
  smtpSendFrom: z.string().email({ message: "Invalid 'Send From' email address."}).optional().nullable(),
});


export async function GET(request: Request) {
  const userId = await getUserIdFromToken(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized. No session found or token invalid.' }, { status: 401 });
  }

  try {
    const stmt = db.prepare('SELECT id, name, email, role, avatarUrl, joinedDate, emailNotificationsEnabled, inAppNotificationsEnabled, isTwoFactorEnabled, twoFactorSecret, smtpHost, smtpPort, smtpEncryption, smtpUsername, smtpPassword, smtpSendFrom FROM users WHERE id = ?');
    const user = stmt.get(userId) as UserWithPreferencesAndSettings | undefined;

    if (!user) {
      return NextResponse.json({ error: 'Current user profile not found' }, { status: 404 });
    }
    // Ensure boolean values are correctly represented (SQLite stores them as 0 or 1)
    user.emailNotificationsEnabled = !!user.emailNotificationsEnabled;
    user.inAppNotificationsEnabled = !!user.inAppNotificationsEnabled;
    user.isTwoFactorEnabled = !!user.isTwoFactorEnabled;
    
    // Ensure nulls for optional fields if they are not set
    user.smtpHost = user.smtpHost || null;
    user.smtpPort = user.smtpPort || null;
    user.smtpEncryption = user.smtpEncryption || null;
    user.smtpUsername = user.smtpUsername || null;
    // Do not return smtpPassword directly in GET profile
    // user.smtpPassword = user.smtpPassword || null; // This line would expose it
    user.smtpSendFrom = user.smtpSendFrom || null;

    // Exclude sensitive data like secrets from the response
    const { twoFactorSecret: __, smtpPassword: ___, ...userResponse } = user;


    return NextResponse.json(userResponse);
  } catch (error) {
    console.error('Failed to fetch current user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const userId = await getUserIdFromToken(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized. No session found or token invalid.' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const validationResult = UpdateProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const { 
        name, email, avatarUrl, 
        emailNotificationsEnabled, inAppNotificationsEnabled, isTwoFactorEnabled,
        smtpHost, smtpPort, smtpEncryption, smtpUsername, smtpPassword, smtpSendFrom
    } = validationResult.data;

    const updateFields: { [key: string]: any } = {};
    if (name !== undefined) updateFields.name = name.trim();
    if (email !== undefined) updateFields.email = email.trim();
    if (avatarUrl !== undefined) updateFields.avatarUrl = avatarUrl; 
    if (emailNotificationsEnabled !== undefined) updateFields.emailNotificationsEnabled = emailNotificationsEnabled ? 1 : 0;
    if (inAppNotificationsEnabled !== undefined) updateFields.inAppNotificationsEnabled = inAppNotificationsEnabled ? 1 : 0;
    
    if (isTwoFactorEnabled !== undefined) {
      updateFields.isTwoFactorEnabled = isTwoFactorEnabled ? 1 : 0;
      if (!isTwoFactorEnabled) { 
        updateFields.twoFactorSecret = null; // Clear the secret if 2FA is being disabled
      }
    }

    // SMTP fields
    if (smtpHost !== undefined) updateFields.smtpHost = smtpHost;
    if (smtpPort !== undefined) updateFields.smtpPort = smtpPort;
    if (smtpEncryption !== undefined) updateFields.smtpEncryption = smtpEncryption;
    if (smtpUsername !== undefined) updateFields.smtpUsername = smtpUsername;
    if (smtpPassword !== undefined) {
        updateFields.smtpPassword = smtpPassword === '' ? null : smtpPassword;
    }
    if (smtpSendFrom !== undefined) updateFields.smtpSendFrom = smtpSendFrom;


    if (Object.keys(updateFields).length === 0) {
      const currentUserStmt = db.prepare('SELECT id, name, email, role, avatarUrl, joinedDate, emailNotificationsEnabled, inAppNotificationsEnabled, isTwoFactorEnabled, smtpHost, smtpPort, smtpEncryption, smtpUsername, smtpSendFrom FROM users WHERE id = ?');
      let currentUser = currentUserStmt.get(userId) as UserWithPreferencesAndSettings;
      if (currentUser) {
        currentUser.emailNotificationsEnabled = !!currentUser.emailNotificationsEnabled;
        currentUser.inAppNotificationsEnabled = !!currentUser.inAppNotificationsEnabled;
        currentUser.isTwoFactorEnabled = !!currentUser.isTwoFactorEnabled;
        currentUser.smtpHost = currentUser.smtpHost || null;
        currentUser.smtpPort = currentUser.smtpPort || null;
        currentUser.smtpEncryption = currentUser.smtpEncryption || null;
        currentUser.smtpUsername = currentUser.smtpUsername || null;
        currentUser.smtpSendFrom = currentUser.smtpSendFrom || null;
      }
      const { twoFactorSecret: _respTwoFactorSecret, smtpPassword: _respSmtpPassword, ...userResponse } = currentUser;
      return NextResponse.json({ message: 'No fields to update', user: userResponse });
    }

    updateFields.updatedAt = new Date().toISOString();
    const setClauses = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updateFields), userId];

    try {
        const stmt = db.prepare(`UPDATE users SET ${setClauses} WHERE id = ?`);
        stmt.run(...values);
    } catch (dbError: any) {
      if (dbError.code === 'SQLITE_CONSTRAINT_UNIQUE' && dbError.message.includes('users.email')) {
        return NextResponse.json({ error: 'Email address already in use by another account.' }, { status: 409 });
      }
      console.error('Database error during profile update:', dbError);
      throw dbError; 
    }
    
    const updatedUserStmt = db.prepare('SELECT id, name, email, role, avatarUrl, joinedDate, emailNotificationsEnabled, inAppNotificationsEnabled, isTwoFactorEnabled, smtpHost, smtpPort, smtpEncryption, smtpUsername, smtpSendFrom FROM users WHERE id = ?');
    let updatedUser = updatedUserStmt.get(userId) as UserWithPreferencesAndSettings;
    if (updatedUser) {
      updatedUser.emailNotificationsEnabled = !!updatedUser.emailNotificationsEnabled;
      updatedUser.inAppNotificationsEnabled = !!updatedUser.inAppNotificationsEnabled;
      updatedUser.isTwoFactorEnabled = !!updatedUser.isTwoFactorEnabled;
      updatedUser.smtpHost = updatedUser.smtpHost || null;
      updatedUser.smtpPort = updatedUser.smtpPort || null;
      updatedUser.smtpEncryption = updatedUser.smtpEncryption || null;
      updatedUser.smtpUsername = updatedUser.smtpUsername || null;
      updatedUser.smtpSendFrom = updatedUser.smtpSendFrom || null;
    }
    const { twoFactorSecret: _retTwoFactorSecret, smtpPassword: _retSmtpPassword, ...userResponseUpdated } = updatedUser;
    return NextResponse.json(userResponseUpdated);
  } catch (error) {
    console.error('Failed to update current user profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
