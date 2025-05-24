import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';

export const runtime = 'edge';

const SmtpValidationSchema = z.object({
  smtpHost: z.string().min(1, { message: "SMTP Host is required." }),
  smtpPort: z.number().int().positive({ message: "SMTP Port must be a positive integer." }),
  smtpEncryption: z.enum(['none', 'ssl', 'starttls']).optional().nullable(),
  smtpUsername: z.string().optional().nullable(),
  smtpPassword: z.string().optional().nullable(),
  smtpSendFrom: z.string().email({ message: "Invalid 'Send From' email address." }).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = SmtpValidationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid SMTP configuration.',
        details: validationResult.error.flatten() 
      }, { status: 400 });
    }

    const { smtpHost, smtpPort, smtpEncryption } = validationResult.data;

    // Validation rules
    const validationErrors = [];

    // Check Gmail-specific configurations
    if (smtpHost.toLowerCase().includes('gmail')) {
      if (smtpPort === 465 && smtpEncryption !== 'ssl') {
        validationErrors.push(`For Gmail on port 465, encryption should be SSL.`);
      }
      if (smtpPort === 587 && smtpEncryption !== 'starttls') {
        validationErrors.push(`For Gmail on port 587, encryption should be STARTTLS.`);
      }
      if (![465, 587].includes(smtpPort)) {
        validationErrors.push(`For Gmail, typical ports are 465 (SSL) or 587 (STARTTLS).`);
      }
    }

    // Check Office 365/Outlook configurations
    if (smtpHost.toLowerCase().includes('office365') || smtpHost.toLowerCase().includes('outlook')) {
      if (smtpPort !== 587 || smtpEncryption !== 'starttls') {
        validationErrors.push(`For Office 365/Outlook, port 587 with STARTTLS is required.`);
      }
    }

    // Common SMTP port validations
    const commonSmtpPorts = [25, 465, 587, 2525];
    if (!commonSmtpPorts.includes(smtpPort)) {
      validationErrors.push(`Port ${smtpPort} is uncommon for SMTP. Common ports are: ${commonSmtpPorts.join(', ')}`);
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'SMTP configuration validation failed.',
        details: validationErrors
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      message: 'SMTP configuration validation passed.',
    });
  } catch (error) {
    console.error('SMTP validation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to validate SMTP configuration.',
    }, { status: 500 });
  }
}
