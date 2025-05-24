import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';

// This endpoint needs Node.js runtime for database access
export const runtime = 'nodejs';

async function hashAPIKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.debug(`[Internal Validator ${requestId}] Request received:`, {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  });

  try {
    const authHeader = request.headers.get('Authorization');
    console.debug(`[Internal Validator ${requestId}] Auth header:`, authHeader);
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.debug(`[Internal Validator ${requestId}] Invalid header format:`, authHeader);
      return NextResponse.json(
        { error: 'Invalid Authorization header format.' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7).trim();
    const hashedKey = await hashAPIKey(apiKey);
    console.debug(`[Internal Validator ${requestId}] Checking hashed key:`, 
      hashedKey.substring(0, 10) + '...');

    // Query the database to find an API key that hasn't been revoked and hasn't expired
    const stmt = db.prepare(`
      SELECT 
        ak.id, 
        ak.userId, 
        ak.revoked,
        ak.expiresAt,
        ak.hashedKey,
        u.role,
        u.id as userExists
      FROM api_keys ak
      INNER JOIN users u ON u.id = ak.userId
      WHERE ak.hashedKey = ?
    `);

    const apiKeyData = stmt.get(hashedKey) as { 
      id: string; 
      userId: string; 
      role: string;
      revoked: number;
      expiresAt: string | null;
      userExists: string;
      hashedKey: string;
    } | undefined;

    console.debug(`[Internal Validator ${requestId}] Database result:`, 
      apiKeyData ? {
        found: true,
        keyId: apiKeyData.id,
        userId: apiKeyData.userId,
        role: apiKeyData.role,
        revoked: apiKeyData.revoked === 1,
        hasExpiry: !!apiKeyData.expiresAt,
        userExists: !!apiKeyData.userExists
      } : { found: false });

    if (!apiKeyData) {
      return NextResponse.json({ error: 'Invalid API key.' }, { status: 401 });
    }

    if (!apiKeyData.userExists) {
      return NextResponse.json({ error: 'Associated user account not found.' }, { status: 401 });
    }

    if (apiKeyData.revoked === 1) {
      return NextResponse.json({ error: 'API key has been revoked.' }, { status: 401 });
    }

    if (apiKeyData.expiresAt && new Date(apiKeyData.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'API key has expired.' }, { status: 401 });
    }

    // Update lastUsedAt timestamp
    const updateStmt = db.prepare('UPDATE api_keys SET lastUsedAt = ? WHERE id = ?');
    updateStmt.run(new Date().toISOString(), apiKeyData.id);

    console.debug(`[Internal Validator ${requestId}] Validation successful:`, {
      userId: apiKeyData.userId,
      role: apiKeyData.role
    });

    return NextResponse.json({
      userId: apiKeyData.userId,
      role: apiKeyData.role
    });

  } catch (error) {
    console.error(`[Internal Validator ${requestId}] Error:`, error);
    return NextResponse.json({ error: 'Failed to validate API key.' }, { status: 500 });
  }
}
