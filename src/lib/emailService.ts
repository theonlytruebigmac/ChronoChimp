
import nodemailer from 'nodemailer';

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
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM_ADDRESS) {
    console.error("ERROR: SMTP environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM_ADDRESS) are not fully configured.");
    console.warn("Email not sent. Simulating email send for development:");
    console.log("====================================================");
    console.log("SIMULATING EMAIL SEND (SMTP NOT CONFIGURED)");
    console.log("====================================================");
    console.log(`From: ${SMTP_FROM_ADDRESS || 'not-configured@example.com'}`);
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

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      // do not fail on invalid certs for local testing if necessary
      // rejectUnauthorized: process.env.NODE_ENV === 'production', 
      rejectUnauthorized: false, // Be cautious with this in production
    }
  });

  try {
    const info = await transporter.sendMail({
      from: `"ChronoTask" <${SMTP_FROM_ADDRESS}>`, // sender address
      to: options.to, // list of receivers
      subject: options.subject, // Subject line
      text: options.text, // plain text body
      html: options.html, // html body
    });
    console.log(`Message sent: ${info.messageId}`);
    // console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`); // Only if using ethereal.email
  } catch (error) {
    console.error(`Failed to send email to ${options.to} via Nodemailer:`, error);
    // Consider how to handle email sending failures in production (e.g., retry queues, notifications)
    throw new Error('Failed to send email.');
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
  const subject = 'Reset Your ChronoTask Password';
  const html = `
    <p>Hello,</p>
    <p>You requested a password reset for your ChronoTask account.</p>
    <p>Please click the link below to reset your password:</p>
    <a href="${resetLink}">${resetLink}</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you did not request a password reset, please ignore this email.</p>
    <p>Thanks,<br>The ChronoTask Team</p>
  `;
  const text = `
    Hello,

    You requested a password reset for your ChronoTask account.
    Please use the following link to reset your password:
    ${resetLink}

    This link will expire in 1 hour.

    If you did not request a password reset, please ignore this email.

    Thanks,
    The ChronoTask Team
  `;

  await sendEmail({ to, subject, html, text });
}

/**
 * Sends a user invitation email.
 * @param to - The recipient's email address.
 * @param token - The invite token.
 */
export async function sendUserInviteEmail(to: string, token: string): Promise<void> {
  if (!BASE_URL) {
    console.error("ERROR: BASE_URL environment variable is not set. Cannot construct invite link.");
     if (process.env.NODE_ENV !== 'production') {
        console.warn(`DEV ONLY - User Invite Token (BASE_URL missing): ${token}`);
    }
  }
  const inviteLink = `${BASE_URL || 'http://localhost:3000'}/auth/accept-invite?token=${token}`;
  const subject = 'You are invited to join ChronoTask!';
  const inviterText = "You've been invited"; 
  
  const html = `
    <p>Hello,</p>
    <p>${inviterText} to join ChronoTask!</p>
    <p>Click the link below to accept your invitation and complete your registration:</p>
    <a href="${inviteLink}">${inviteLink}</a>
    <p>This invitation will expire in 7 days.</p>
    <p>Thanks,<br>The ChronoTask Team</p>
  `;
  const text = `
    Hello,

    ${inviterText} to join ChronoTask!
    Click the link below to accept your invitation and complete your registration:
    ${inviteLink}

    This invitation will expire in 7 days.

    Thanks,
    The ChronoTask Team
  `;

  await sendEmail({ to, subject, html, text });
}
