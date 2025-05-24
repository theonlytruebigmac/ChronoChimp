// This route handles database operations for API keys
// This is NOT an edge function and can use Node.js features
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { getAuthUserId } from '@/lib/auth';

const ApiKeySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  keyPrefix: z.string().min(1),
  hashedKey: z.string().min(1),
  last4: z.string().length(4),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable()
});

// This endpoint needs server runtime for database access
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyPrefix = searchParams.get('keyPrefix');
    const userId = searchParams.get('userId');
    const apiKey = searchParams.get('apiKey'); // For validation

    // Check authentication for non-validation requests
    if (!keyPrefix && userId) {
      const authUserId = await getAuthUserId(request);
      
      if (!authUserId) {
        return NextResponse.json(
          { 
            error: 'Unauthorized',
            details: 'This endpoint requires authentication'
          },
          { 
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'WWW-Authenticate': 'Bearer realm="ChronoChimp API"'
            }
          }
        );
      }
    }

    if (keyPrefix) {
      // Look up API key by keyPrefix
      const stmt = db.prepare(`
        SELECT ak.userId, ak.role, ak.hashedKey
        FROM api_keys ak 
        WHERE ak.keyPrefix = ? AND ak.revoked = 0
      `);
      const result = stmt.get(keyPrefix);
      if (!result) {
        return NextResponse.json({ error: 'API key not found' }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    if (userId) {
      // Get all API keys for a user
      const stmt = db.prepare(`
        SELECT id, name, keyPrefix, last4, createdAt, expiresAt, lastUsedAt
        FROM api_keys
        WHERE userId = ? AND revoked = 0
      `);
      const results = stmt.all(userId);
      return NextResponse.json(results);
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error with API keys DB operation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authUserId = await getAuthUserId(request);
      
  if (!authUserId) {
    return NextResponse.json(
      { 
        error: 'Unauthorized',
        details: 'This endpoint requires authentication'
      },
      { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer realm="ChronoChimp API"'
        }
      }
    );
  }
  
  try {
    const body = await request.json();
    const validationResult = ApiKeySchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input', details: validationResult.error.flatten() }, { status: 400 });
    }
    
    const { id, userId, name, keyPrefix, hashedKey, last4, createdAt, expiresAt } = validationResult.data;

    // Store new API key in database
    const stmt = db.prepare(`
      INSERT INTO api_keys (id, userId, name, keyPrefix, hashedKey, last4, createdAt, expiresAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, userId, name, keyPrefix, hashedKey, last4, createdAt, expiresAt);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authUserId = await getAuthUserId(request);
      
  if (!authUserId) {
    return NextResponse.json(
      { 
        error: 'Unauthorized',
        details: 'This endpoint requires authentication'
      },
      { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer realm="ChronoChimp API"'
        }
      }
    );
  }
  
  try {
    const { keyPrefix } = await request.json();
    if (!keyPrefix) {
      return NextResponse.json({ error: 'API key prefix required' }, { status: 400 });
    }

    // Update last used timestamp
    const stmt = db.prepare('UPDATE api_keys SET lastUsedAt = ? WHERE keyPrefix = ?');
    stmt.run(new Date().toISOString(), keyPrefix);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating API key last used:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
