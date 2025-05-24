import { NextResponse, NextRequest } from 'next/server';

// This route serves as a redirect to the Edge API key validator
export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // Forward all headers and body to edge validator
    const edgeValidation = await fetch(`${request.nextUrl.origin}/api/auth/validate-key/edge`, {
      method: 'POST',
      headers: request.headers
    });

    const result = await edgeValidation.json();
    return NextResponse.json(result, { status: edgeValidation.status });

  } catch (error) {
    console.error('[API Key Validation] Failed to validate key:', error);
    return NextResponse.json({ error: 'Internal server error during validation' }, { status: 500 });
  }
}
