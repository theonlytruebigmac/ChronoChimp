
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { sendPasswordResetEmail } from '@/lib/emailService'; // Import the email service

const SALT_ROUNDS = 10; // For hashing the token
const TOKEN_EXPIRATION_HOURS = 1;

const ForgotPasswordInputSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = ForgotPasswordInputSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(e => e.message).join(', ');
      return NextResponse.json({ error: errorMessages, details: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email } = validationResult.data;

    // 1. Check if a user with this email exists.
    const userStmt = db.prepare('SELECT id FROM users WHERE email = ?');
    const user = userStmt.get(email) as { id: string } | undefined;

    if (user) {
      // 2. Generate a unique, time-sensitive password reset token.
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(rawToken, SALT_ROUNDS);
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRATION_HOURS);

      // 3. Store this hashed token associated with the user's account.
      // First, delete any existing tokens for this user to prevent multiple active tokens
      const deleteExistingStmt = db.prepare('DELETE FROM password_reset_tokens WHERE userId = ?');
      deleteExistingStmt.run(user.id);

      const tokenId = randomUUID();
      const insertTokenStmt = db.prepare('INSERT INTO password_reset_tokens (id, userId, token, expiresAt) VALUES (?, ?, ?, ?)');
      insertTokenStmt.run(tokenId, user.id, hashedToken, expiresAt.toISOString());

      // 4. Send the password reset email (simulated)
      try {
        await sendPasswordResetEmail(email, rawToken);
      } catch (emailError) {
        console.error("Failed to send password reset email (simulation may have issues):", emailError);
        // Continue even if email sending fails in this dev setup, but log it.
        // In production, you might want to return an error or retry.
      }
    } else {
      // User not found, but we don't want to reveal this for security reasons (user enumeration)
      // console.log(`Password reset attempt for non-existent email: ${email}`);
    }

    // Always return a generic success message to prevent user enumeration.
    return NextResponse.json({ message: "If an account with that email exists, instructions to reset your password have been sent." });

  } catch (error) {
    console.error('Forgot password request failed:', error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again later.' }, { status: 500 });
  }
}
