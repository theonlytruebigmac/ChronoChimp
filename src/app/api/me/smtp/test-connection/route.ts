// filepath: /home/fraziersystems/appdata/chronochimp/src/app/api/me/smtp/test-connection/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUserId } from '@/lib/auth';

const SmtpTestSchema = z.object({
  smtpHost: z.string().min(1, { message: "SMTP Host is required."}),
  smtpPort: z.number().int().positive({ message: "SMTP Port must be a positive integer."}),
  smtpEncryption: z.enum(['none', 'ssl', 'starttls']).optional().nullable(),
  smtpUsername: z.string().optional().nullable(),
  smtpPassword: z.string().optional().nullable(),
  smtpSendFrom: z.string().email({ message: "Invalid 'Send From' email address."}).optional().nullable(),
});


export async function POST(request: NextRequest) {
  const userId = await getAuthUserId(request);
  
  if (!userId) {
    const authHeader = request.headers.get('Authorization');
    const xUserId = request.headers.get('X-User-Id');
    
    console.debug("Auth failure in /api/me/smtp/test-connection:", {
      hasAuthHeader: !!authHeader,
      headerUserId: xUserId
    });
    
    return NextResponse.json(
      { 
        success: false,
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

  try {
    const body = await request.json();
    const validationResult = SmtpTestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ success: false, message: 'Invalid input.', details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }
    
    const { smtpHost, smtpPort, smtpEncryption, smtpUsername, smtpSendFrom } = validationResult.data;

    // Simulate SMTP connection test
    console.log(`[SMTP Test Simulate] Attempting connection to ${smtpHost}:${smtpPort} for user: ${userId}, from: ${smtpSendFrom}`);

    // --- More specific simulated checks ---
    if (smtpHost.toLowerCase().includes('gmail')) {
      if (smtpPort === 465 && smtpEncryption !== 'ssl') {
        return NextResponse.json({ success: false, message: `Simulated: For Gmail on port 465, encryption should be SSL. Current: ${smtpEncryption || 'not set'}.` }, { status: 200 });
      }
      if (smtpPort === 587 && smtpEncryption !== 'starttls') {
        return NextResponse.json({ success: false, message: `Simulated: For Gmail on port 587, encryption should be STARTTLS. Current: ${smtpEncryption || 'not set'}.` }, { status: 200 });
      }
      if (![465, 587].includes(smtpPort)) {
        return NextResponse.json({ success: false, message: `Simulated: For Gmail, typical ports are 465 (SSL) or 587 (STARTTLS). Current port: ${smtpPort}.` }, { status: 200 });
      }
    }

    if (smtpHost.toLowerCase().includes('office365') || smtpHost.toLowerCase().includes('outlook')) {
        if (smtpPort !== 587 || smtpEncryption !== 'starttls') {
             return NextResponse.json({ success: false, message: `Simulated: For Office 365/Outlook, port 587 with STARTTLS is typical. Current: Port ${smtpPort}, Encryption ${smtpEncryption || 'not set'}.` }, { status: 200 });
        }
    }
    
    // Basic check for common misconfigurations (simulated)
    if (smtpHost === 'smtp.example.com' && smtpUsername === 'testuser') {
       // Simulate a known good connection
        return NextResponse.json({ success: true, message: `Successfully connected to ${smtpHost} (simulated).` });
    }
    if (smtpHost === 'bad.host.example') {
      return NextResponse.json({ success: false, message: 'Connection to bad.host.example failed (simulated): Host not found.' }, { status: 200 }); // return 200 for user message
    }


    // TODO: In a real application, use a library like Nodemailer to actually connect to the SMTP server
    // and attempt to send a test email or verify credentials.
    // For example:
    // const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    // await transporter.verify();
    // For now, we just simulate success if basic fields are present.
    if (smtpHost && smtpPort) {
      return NextResponse.json({ success: true, message: `SMTP connection test to ${smtpHost}:${smtpPort} was successful (simulated).` });
    } else {
      // This case should be caught by Zod validation now.
      return NextResponse.json({ success: false, message: 'SMTP Host and Port are required for testing (simulated).' }, { status: 200 });
    }

  } catch (error) {
    console.error('SMTP connection test failed:', error);
    return NextResponse.json({ success: false, message: 'Failed to simulate SMTP connection test due to an unexpected error.' }, { status: 500 });
  }
}
