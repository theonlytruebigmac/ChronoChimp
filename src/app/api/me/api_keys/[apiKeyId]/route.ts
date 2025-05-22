import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// Ensure JWT_SECRET is used from environment variables
const JWT_SECRET_STRING = process.env.JWT_SECRET;

interface Params {
  params: { apiKeyId: string };
}

async function getUserIdFromToken(): Promise<string | null> {
  if (!JWT_SECRET_STRING) {
    console.error("JWT_SECRET is not defined in environment variables. /api/me/api_keys/[apiKeyId] cannot function securely.");
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) {
    return null;
  }
  try {
    const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.userId as string;
  } catch (error) {
    console.error('JWT verification failed in /api/me/api_keys/[apiKeyId]:', error);
    return null;
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const userId = await getUserIdFromToken();
  
  if (!JWT_SECRET_STRING) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized. No session found or token invalid.' }, { status: 401 });
  }

  try {
    const { apiKeyId } = params;
    // Ensure the API key belongs to the authenticated user before deleting
    const stmt = db.prepare('DELETE FROM api_keys WHERE id = ? AND userId = ?');
    const info = stmt.run(apiKeyId, userId);

    if (info.changes === 0) {
      return NextResponse.json({ error: 'API Key not found or not owned by user' }, { status: 404 });
    }
    
    return NextResponse.json({ message: `API Key ${apiKeyId} revoked successfully` });
  } catch (error) {
    console.error(`Failed to revoke API key ${params.apiKeyId}:`, error);
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}
