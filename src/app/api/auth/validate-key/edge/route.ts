import { NextResponse, NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.debug(`[Edge Validator ${requestId}] Request received:`, {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  });

  try {
    const authHeader = request.headers.get('Authorization');
    console.debug(`[Edge Validator ${requestId}] Auth header:`, authHeader);

    if (!authHeader?.startsWith('Bearer ')) {
      console.debug(`[Edge Validator ${requestId}] Invalid header format:`, authHeader);
      return NextResponse.json(
        { error: 'Invalid Authorization header format.' },
        { status: 401 }
      );
    }

    // Forward validation to Node.js API endpoint
    const origin = request.nextUrl.origin;
    const keyValidationUrl = new URL('/api/internal/validate-key', origin);
    console.debug(`[Edge Validator ${requestId}] Forwarding to:`, {
      url: keyValidationUrl.toString(),
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });

    const validation = await fetch(keyValidationUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    const result = await validation.json();
    console.debug(`[Edge Validator ${requestId}] Internal validation response:`, {
      status: validation.status,
      result: result
    });

    if (!validation.ok) {
      console.debug(`[Edge Validator ${requestId}] Validation failed:`, result);
      return NextResponse.json(
        { error: result.error || 'Key validation failed' },
        { status: validation.status }
      );
    }

    if (!result.userId || !result.role) {
      console.debug(`[Edge Validator ${requestId}] Invalid response:`, result);
      return NextResponse.json(
        { error: result.error || 'Invalid API key validation response' },
        { status: 401 }
      );
    }

    console.debug(`[Edge Validator ${requestId}] Validation successful:`, {
      userId: result.userId,
      role: result.role
    });

    // Return successful validation result with user info
    return NextResponse.json({
      userId: result.userId,
      role: result.role
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error(`[Edge Validator ${requestId}] Error:`, error);
    return NextResponse.json(
      { error: 'Internal server error during validation' },
      { status: 500 }
    );
  }
}
