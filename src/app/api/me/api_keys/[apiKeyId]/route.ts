import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';

// This endpoint needs Node.js runtime for database operations
export const runtime = 'nodejs';

// Use the proper type definition for Next.js App Router
type Params = {
  params: {
    apiKeyId: string;
  };
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: { apiKeyId: string } }
) {
  const apiKeyId = params.apiKeyId;
  const userId = await getAuthUserId(request);
  
  if (!userId) {
    return NextResponse.json(
      { 
        error: 'Unauthorized',
        details: 'This endpoint requires authentication.'
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
    const now = new Date().toISOString();
    
    // Soft delete by marking as revoked
    const updateStmt = db.prepare(`
      UPDATE api_keys 
      SET revoked = 1
      WHERE id = ? AND userId = ?
    `);
    
    const result = updateStmt.run(apiKeyId, userId);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'API key not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to revoke API key:', error);
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}
