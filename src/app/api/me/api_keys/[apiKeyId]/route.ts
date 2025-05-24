import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';

interface ApiResponse {
  message?: string;
  error?: string;
}

export async function DELETE(
  request: NextRequest,
  { params: { apiKeyId } }: { params: { apiKeyId: string } }
): Promise<NextResponse<ApiResponse>> {
  const userId = await getAuthUserId(request);
  
  if (!userId) {
    const authHeader = request.headers.get('Authorization');
    const xUserId = request.headers.get('X-User-Id');
    
    console.debug("Auth failure in /api/me/api_keys/[apiKeyId]:", {
      hasAuthHeader: !!authHeader,
      headerUserId: xUserId
    });
    
    return NextResponse.json(
      { 
        error: 'Unauthorized',
        details: 'This endpoint requires authentication. You can authenticate using either:\n' +
                '1. Session token cookie (for browser requests)\n' +
                '2. API key in Authorization header (for API requests, format: "Bearer YOUR_API_KEY")'
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

  if (!apiKeyId) {
    return NextResponse.json({ error: 'API key ID is required' }, { status: 400 });
  }

  try {
    // Ensure API key exists and belongs to user before deleting
    const checkStmt = db.prepare('SELECT id FROM api_keys WHERE id = ? AND userId = ?');
    const existingKey = checkStmt.get(apiKeyId, userId);
    
    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found or not owned by user' }, { status: 404 });
    }

    // Delete the key
    const deleteStmt = db.prepare('DELETE FROM api_keys WHERE id = ? AND userId = ?');
    const result = deleteStmt.run(apiKeyId, userId);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
    }
    
    return NextResponse.json({ message: `API key ${apiKeyId} revoked successfully` });
  } catch (error) {
    console.error(`Failed to revoke API key ${apiKeyId}:`, error);
    return NextResponse.json({ error: 'Internal server error while revoking API key' }, { status: 500 });
  }}
