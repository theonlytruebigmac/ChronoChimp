import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// These environment variables MUST be set for Nodemailer to function.
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS; // SMTP Password
const SMTP_FROM_ADDRESS = process.env.SMTP_FROM_ADDRESS || process.env.EMAIL_FROM; // Use SMTP_FROM_ADDRESS or fallback to EMAIL_FROM
const SMTP_SECURE = process.env.SMTP_SECURE === 'true'; // Use true for port 465, false for most others (STARTTLS)

const BASE_URL = process.env.BASE_URL;

/**
 * Sends an email using Nodemailer.
 * @param options - Email options including recipient, subject, and content.
 */
async function sendEmail(options: EmailOptions): Promise<void> {
  // Try to get user-configured SMTP settings first
  const userSmtpSettings = await getUserSmtpSettings();
  
  // Use user settings if available, fall back to environment variables
  const host = userSmtpSettings?.host || SMTP_HOST;
  const port = userSmtpSettings?.port || SMTP_PORT;
  const encryption = userSmtpSettings?.encryption || (SMTP_SECURE ? 'ssl' : 'starttls');
  const username = userSmtpSettings?.username || SMTP_USER;
  const password = userSmtpSettings?.password || SMTP_PASS;
  const fromAddress = userSmtpSettings?.fromAddress || SMTP_FROM_ADDRESS;
  
  // Check if we have the minimum required settings
  if (!host || !username || !password || !fromAddress) {
    console.error("ERROR: SMTP settings (host, username, password, from address) are not fully configured.");
    console.warn("Email not sent. Simulating email send for development:");
    console.log("====================================================");
    console.log("SIMULATING EMAIL SEND (SMTP NOT CONFIGURED)");
    console.log("====================================================");
    console.log(`From: ${fromAddress || 'not-configured@example.com'}`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log("---------------- HTML Body -----------------------");
    console.log(options.html);
    console.log("---------------- Text Body -----------------------");
    console.log(options.text);
    console.log("====================================================");
    // In a real app, you might throw an error here or have a more robust fallback.
    // For now, we'll just log and return to not break the flow if SMTP isn't set up.
    return;
  }

  // Create transport config with correct TypeScript typing for SMTP
  const transportConfig: SMTPTransport.Options = {
    host,
    port,
    secure: encryption === 'ssl', // true for 465, false for other ports like 587 (STARTTLS)
    auth: {
      user: username,
      pass: password,
    },
    tls: {
      // Disable TLS certificate validation in development
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    }
  };
  
  // Add requireTLS conditionally
  if (encryption === 'starttls') {
    transportConfig.requireTLS = true;
  }
  
  console.log(`Attempting to send email using: ${host}:${port} (${encryption}) from ${fromAddress}`);

  try {
    const transporter = nodemailer.createTransport(transportConfig);
    
    // Verify connection configuration
    await transporter.verify().catch((verifyError) => {
      console.error('SMTP Verification failed:', verifyError);
      throw verifyError;
    });

    const info = await transporter.sendMail({
      from: `"ChronoChimp" <${fromAddress}>`, // sender address
      to: options.to, // list of receivers
      subject: options.subject, // Subject line
      text: options.text, // plain text body
      html: options.html, // html body
    });
    
    console.log(`Message sent: ${info.messageId}`);
  } catch (err) {
    console.error(`Failed to send email to ${options.to} via Nodemailer:`, err);
    
    // Log more specific error messages to help with debugging - using proper type checking
    const error = err as any; // Type assertion for error handling
    if (error && typeof error === 'object') {
      if (error.code === 'ESOCKET' && error.command === 'CONN') {
        console.error(`SMTP Connection Error: Likely incorrect port or encryption settings for ${host}:${port}`);
        console.error(`Try using a different port (587 for STARTTLS, 465 for SSL) or encryption method`);
      }
    }
    
    // Instead of throwing, return a simulated success in development
    if (process.env.NODE_ENV !== 'production') {
      console.warn("Simulating email send due to SMTP error in development environment");
      console.log("====== SIMULATED EMAIL ======");
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Text: ${options.text.substring(0, 100)}...`);
      return; // Don't throw in development
    }
    
    // In production, still throw but with more context
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to send email: ${errorMessage}`);
  }
}

// Add function to check for user SMTP settings in database
async function getUserSmtpSettings(): Promise<{
  host: string | null;
  port: number | null;
  encryption: string | null;
  username: string | null;
  password: string | null;
  fromAddress: string | null;
} | null> {
  try {
    const { db } = await import('@/lib/db');
    
    // Get first admin user's SMTP settings - in a real app, this might come from a specific configured account
    // or from global settings
    const stmt = db.prepare(`
      SELECT smtpHost, smtpPort, smtpEncryption, smtpUsername, smtpPassword, smtpSendFrom 
      FROM users 
      WHERE role = 'Admin' AND smtpHost IS NOT NULL 
      LIMIT 1
    `);
    
    const settings = stmt.get() as {
      smtpHost: string | null;
      smtpPort: number | null;
      smtpEncryption: string | null;
      smtpUsername: string | null;
      smtpPassword: string | null;
      smtpSendFrom: string | null;
    } | undefined;

    if (!settings) return null;

    return {
      host: settings.smtpHost,
      port: settings.smtpPort,
      encryption: settings.smtpEncryption,
      username: settings.smtpUsername,
      password: settings.smtpPassword,
      fromAddress: settings.smtpSendFrom
    };
  } catch (error) {
    console.error("Error fetching user SMTP settings:", error);
    return null;
  }
}

/**
 * Sends a password reset email.
 * @param to - The recipient's email address.
 * @param token - The password reset token.
 */
export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  if (!BASE_URL) {
    console.error("ERROR: BASE_URL environment variable is not set. Cannot construct password reset link.");
    // Log the token if BASE_URL is missing, so it's not lost during development
    if (process.env.NODE_ENV !== 'production') {
        console.warn(`DEV ONLY - Password Reset Token (BASE_URL missing): ${token}`);
    }
  }
  const resetLink = `${BASE_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;
  const subject = 'Reset Your ChronoChimp Password';
  const html = `
    <p>Hello,</p>
    <p>You requested a password reset for your ChronoChimp account.</p>
    <p>Please click the link below to reset your password:</p>
    <a href="${resetLink}">${resetLink}</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you did not request a password reset, please ignore this email.</p>
    <p>Thanks,<br>The ChronoChimp Team</p>
  `;
  const text = `
    Hello,

    You requested a password reset for your ChronoChimp account.
    Please use the following link to reset your password:
    ${resetLink}

    This link will expire in 1 hour.

    If you did not request a password reset, please ignore this email.

    Thanks,
    The ChronoChimp Team
  `;

  await sendEmail({ to, subject, html, text });
}

/**
 * Sends a user invitation email.
 * @param to - The recipient's email address.
 * @param token - The invite token.
 */
export async function sendUserInviteEmail(to: string, token: string): Promise<void> {
  // Get base URL from environment or from database settings
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL;
  
  // If no base URL configured, try to get it from the database
  if (!baseUrl) {
    try {
      const { db } = await import('@/lib/db');
      const stmt = db.prepare("SELECT value FROM app_settings WHERE key = 'baseUrl' LIMIT 1");
      const result = stmt.get() as { value: string } | undefined;
      if (result) baseUrl = result.value;
    } catch (error) {
      console.error("Error fetching base URL from database:", error);
    }
  }
  
  if (!baseUrl) {
    console.error("ERROR: Base URL is not set. Cannot construct invite link.");
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`DEV ONLY - User Invite Token (baseUrl missing): ${token}`);
    }
    baseUrl = 'http://localhost:3000'; // Fallback for development
  }
  
  const inviteLink = `${baseUrl}/auth/accept-invite?token=${token}`;
  const subject = 'You are invited to join ChronoChimp!';
  const inviterText = "You've been invited"; 
  
  const html = `
    <p>Hello,</p>
    <p>${inviterText} to join ChronoChimp!</p>
    <p>Click the link below to accept your invitation and complete your registration:</p>
    <a href="${inviteLink}">${inviteLink}</a>
    <p>This invitation will expire in 3 days.</p>
    <p>Thanks,<br>The ChronoChimp Team</p>
  `;
  const text = `
    Hello,

    ${inviterText} to join ChronoChimp!
    Click the link below to accept your invitation and complete your registration:
    ${inviteLink}

    This invitation will expire in 3 days.

    Thanks,
    The ChronoChimp Team
  `;

  await sendEmail({ to, subject, html, text });
}
