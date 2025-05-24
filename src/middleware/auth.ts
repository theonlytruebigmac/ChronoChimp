import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';

interface ApiKeyData {
  id: string;
  userId: string;
  revoked: number;
  expiresAt: string | null;
  userRole: string;
}

export async function validateApiKey(request: NextRequest) {
  const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keyPrefix = apiKey.substring(0, 8);
  
  const keyData = await db.prepare(`
    SELECT ak.id, ak.userId, ak.revoked, ak.expiresAt, u.role as userRole
    FROM api_keys ak
    JOIN users u ON ak.userId = u.id
    WHERE ak.keyPrefix = ? AND ak.revoked = 0
  `).get(keyPrefix) as ApiKeyData;

  if (!keyData || keyData.revoked || (keyData.expiresAt && new Date(keyData.expiresAt) < new Date())) {
    return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 });
  }

  return NextResponse.next();
}
