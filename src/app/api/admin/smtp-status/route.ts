import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUserId, verify } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const authUser = await verify(request);

  if (!authUser) {
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
  
  // Check if user has admin role
  if (authUser.role !== 'Admin') {
    return NextResponse.json(
      { 
        error: 'Forbidden',
        details: 'This endpoint requires admin privileges'
      },
      { 
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  try {
    // Check if SMTP is configured in environment variables
    const envConfigured = !!(
      process.env.SMTP_HOST && 
      process.env.SMTP_USER && 
      process.env.SMTP_PASS && 
      process.env.SMTP_FROM_ADDRESS
    );
    
    // Or check if at least one admin has configured SMTP
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'Admin' 
        AND smtpHost IS NOT NULL 
        AND smtpUsername IS NOT NULL 
        AND smtpPassword IS NOT NULL 
        AND smtpSendFrom IS NOT NULL
    `);
    
    const result = stmt.get() as { count: number };
    const dbConfigured = result.count > 0;
    
    return NextResponse.json({ 
      configured: envConfigured || dbConfigured,
      source: envConfigured ? 'environment' : (dbConfigured ? 'database' : 'none')
    });
  } catch (error) {
    console.error('Error checking SMTP status:', error);
    return NextResponse.json({ configured: false, error: 'Failed to check SMTP status' }, { status: 500 });
  }
}
