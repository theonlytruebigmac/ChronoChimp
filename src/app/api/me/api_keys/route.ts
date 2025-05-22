
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';

const SALT_ROUNDS = 10;

// Ensure JWT_SECRET is used from environment variables
const JWT_SECRET_STRING = process.env.JWT_SECRET;
let JWT_SECRET_UINT8ARRAY: Uint8Array;

async function getJwtSecretKey(): Promise<Uint8Array> {
  if (!JWT_SECRET_STRING) {
    throw new Error("JWT_SECRET_NOT_CONFIGURED");
  }
  if (!JWT_SECRET_UINT8ARRAY) {
    JWT_SECRET_UINT8ARRAY = new TextEncoder().encode(JWT_SECRET_STRING);
  }
  return JWT_SECRET_UINT8ARRAY;
}

interface AuthenticatedUser extends JWTPayload {
  userId: string;
  email: string;
  // Add other fields from your JWT payload if necessary
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) {
    return null;
  }
  try {
    const secret = await getJwtSecretKey();
    const { payload } = await jwtVerify(token, secret) as { payload: AuthenticatedUser };
    return payload.userId;
  } catch (error) {
    console.error('JWT verification failed in /api/me/api_keys:', error);
    return null;
  }
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  last4: string;
  fullKey?: string; // Only for immediate display after creation
  createdAt: string; 
  expiresAt?: string | null; // Allow null
  lastUsedAt?: string | null; // Allow null
  userId?: string; 
}

const CreateApiKeySchema = z.object({
  name: z.string().min(1, { message: "API Key name cannot be empty." }),
  expiresInDays: z.number().int().positive().optional().nullable(),
});

export async function GET(request: Request) {
  let userId: string | null;
  try {
    userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. No session found or token invalid.' }, { status: 401 });
    }
  } catch (error: any) {
    if (error.message === "JWT_SECRET_NOT_CONFIGURED") {
      return NextResponse.json({ error: 'Server configuration error: JWT_SECRET is not set.' }, { status: 500 });
    }
    console.error("Error getting authenticated user ID:", error);
    return NextResponse.json({ error: 'Internal server error during authentication.' }, { status: 500 });
  }


  try {
    const stmt = db.prepare('SELECT id, name, keyPrefix, last4, createdAt, expiresAt, lastUsedAt FROM api_keys WHERE userId = ? ORDER BY createdAt DESC');
    const apiKeys = stmt.all(userId) as Omit<ApiKey, 'fullKey' | 'userId' | 'hashedKey'>[];
    return NextResponse.json(apiKeys);
  } catch (error) {
    console.error('Failed to fetch API keys:', error);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let userId: string | null;
   try {
    userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. No session found or token invalid.' }, { status: 401 });
    }
  } catch (error: any) {
    if (error.message === "JWT_SECRET_NOT_CONFIGURED") {
      return NextResponse.json({ error: 'Server configuration error: JWT_SECRET is not set.' }, { status: 500 });
    }
    console.error("Error getting authenticated user ID:", error);
    return NextResponse.json({ error: 'Internal server error during authentication.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const validationResult = CreateApiKeySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const { name, expiresInDays } = validationResult.data;

    const newApiKeyId = randomUUID();
    const now = new Date();
    const createdAtIso = now.toISOString();
    
    let expiresAtIso: string | null = null;
    if (expiresInDays) {
      const expiresAtDate = new Date(now);
      expiresAtDate.setDate(expiresAtDate.getDate() + expiresInDays);
      expiresAtIso = expiresAtDate.toISOString();
    }
    
    const rawKeyBytes = crypto.getRandomValues(new Uint8Array(32));
    const rawKey = Array.from(rawKeyBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    
    const keyPrefix = 'sk_live_demo_'; 
    const fullRawKeyWithPrefix = `${keyPrefix}${rawKey}`;
    const last4 = fullRawKeyWithPrefix.slice(-4);
    
    const hashedKey = await bcrypt.hash(fullRawKeyWithPrefix, SALT_ROUNDS);

    const stmt = db.prepare(`
      INSERT INTO api_keys (id, userId, name, keyPrefix, hashedKey, last4, createdAt, expiresAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(newApiKeyId, userId, name.trim(), keyPrefix, hashedKey, last4, createdAtIso, expiresAtIso);

    const newApiKeyResponse: ApiKey = {
      id: newApiKeyId,
      name: name.trim(),
      keyPrefix,
      last4,
      fullKey: fullRawKeyWithPrefix, 
      createdAt: createdAtIso,
      expiresAt: expiresAtIso,
    };
    
    return NextResponse.json(newApiKeyResponse, { status: 201 });
  } catch (error) {
    console.error('Failed to create API key:', error);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}
