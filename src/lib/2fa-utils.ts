import { authenticator } from 'otplib';
import { encrypt, decrypt, isEncrypted } from './encryption';

/**
 * Validates a one-time password (OTP) against a user's secret
 * @param otp The 6-digit code entered by the user
 * @param encryptedSecret The user's encrypted secret key stored in the database
 * @returns Boolean indicating if the OTP is valid
 */
export function validateOtp(otp: string, encryptedSecret: string): boolean {
  try {
    // Add debug logging
    console.debug('Validating OTP with secret:', {
      isEncryptedFormat: isEncrypted(encryptedSecret),
      secretLength: encryptedSecret.length,
      secretFormat: encryptedSecret.includes(':') ? 'contains separators' : 'no separators'
    });

    // Decrypt the secret if it's encrypted
    const secret = isEncrypted(encryptedSecret) ? decrypt(encryptedSecret) : encryptedSecret;
    
    // Log successful decryption (without revealing the secret)
    console.debug('Secret decrypted successfully, length:', secret.length);
    
    return authenticator.check(otp, secret);
  } catch (error) {
    console.error('OTP validation error:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return false;
  }
}

/**
 * Generates a new secret for 2FA setup
 * @param userEmail The user's email address
 * @param appName The name of the application
 * @returns Object containing the secret, encrypted secret, and OTP auth URL
 */
export function generate2FASecret(userEmail: string, appName: string = "ChronoChimp") {
  const secret = authenticator.generateSecret();
  const otpAuthUrl = authenticator.keyuri(userEmail, appName, secret);
  const encryptedSecret = encrypt(secret);
  
  return {
    secret,
    encryptedSecret,
    otpAuthUrl
  };
}
