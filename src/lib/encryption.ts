/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM encryption with a random IV for each encryption
 */
import crypto from 'crypto';

// Get encryption key from environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const OLD_ENCRYPTION_KEY = process.env.OLD_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.error('CRITICAL: ENCRYPTION_KEY environment variable is not set');
  throw new Error('ENCRYPTION_KEY must be set');
}

// Ensure the key is the correct length for AES-256 (32 bytes)
let encryptionKey = Buffer.from(ENCRYPTION_KEY).slice(0, 32);
if (encryptionKey.length < 32) {
  // Pad the key if it's too short
  const padding = Buffer.alloc(32 - encryptionKey.length, 0);
  encryptionKey = Buffer.concat([encryptionKey, padding]);
  console.warn('WARNING: ENCRYPTION_KEY was too short and has been padded. This is insecure for production use.');
}

// If old key is provided, prepare it for fallback decryption
let oldEncryptionKey: Buffer | undefined;
if (OLD_ENCRYPTION_KEY) {
  oldEncryptionKey = Buffer.from(OLD_ENCRYPTION_KEY).slice(0, 32);
  if (oldEncryptionKey.length < 32) {
    const padding = Buffer.alloc(32 - oldEncryptionKey.length, 0);
    oldEncryptionKey = Buffer.concat([oldEncryptionKey, padding]);
  }
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param text The plaintext to encrypt
 * @returns The encrypted data with IV and auth tag
 */
export function encrypt(text: string): string {
  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher using AES-256-GCM
    const cipher = crypto.createCipheriv(
      'aes-256-gcm', 
      encryptionKey, 
      iv
    );
    
    // Encrypt the data
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data that was encrypted with the encrypt function
 * @param encryptedData The encrypted data in the format iv:authTag:encryptedText
 * @returns The decrypted plaintext
 */
export function decrypt(encryptedData: string): string {
  try {
    // Add input validation and debug logging
    if (!encryptedData) {
      throw new Error('Encrypted data is empty');
    }

    console.debug('Attempting to decrypt data:', {
      dataLength: encryptedData.length,
      format: encryptedData.split(':').length === 3 ? 'valid' : 'invalid'
    });

    // Split the encrypted data into its components
    const [ivHex, authTagHex, encryptedText] = encryptedData.split(':');
    
    if (!ivHex || !authTagHex || !encryptedText) {
      throw new Error('Invalid encrypted data format - missing required components');
    }

    // Validate hex formats
    if (!/^[0-9a-f]+$/i.test(ivHex) || !/^[0-9a-f]+$/i.test(authTagHex) || !/^[0-9a-f]+$/i.test(encryptedText)) {
      throw new Error('Invalid hex encoding in encrypted data');
    }
    
    // Convert hex strings back to buffers
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Validate IV length (should be 16 bytes)
    if (iv.length !== 16) {
      throw new Error('Invalid IV length');
    }

    // Validate auth tag length (should be 16 bytes for GCM)
    if (authTag.length !== 16) {
      throw new Error('Invalid auth tag length');
    }
    
    // Try decryption with current key
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      console.debug('Decryption successful with current key');
      return decrypted;
    } catch (err) {
      // If we have an old key and the error was authentication failure, try with old key
      if (oldEncryptionKey && err instanceof Error && err.message === 'Unsupported state or unable to authenticate data') {
        console.debug('Decryption with current key failed, trying old key');
        const decipher = crypto.createDecipheriv('aes-256-gcm', oldEncryptionKey, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        console.debug('Decryption successful with old key');
        return decrypted;
      }
      throw err;
    }
  } catch (error) {
    console.error('Decryption error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error; // Rethrow with original error details
  }
}

/**
 * Determines if a string is already encrypted
 * @param text Text to check
 * @returns Boolean indicating if the text appears to be encrypted
 */
export function isEncrypted(text: string): boolean {
  // Check if the string matches our encryption format (iv:authTag:encryptedText)
  // Each part should be a valid hex string
  const parts = text.split(':');
  if (parts.length !== 3) return false;
  
  const [ivHex, authTagHex, encryptedText] = parts;
  
  // IV should be 16 bytes (32 hex chars)
  if (ivHex.length !== 32) return false;
  
  // Auth tag should be 16 bytes (32 hex chars)
  if (authTagHex.length !== 32) return false;
  
  // All parts should be valid hex
  const hexRegex = /^[0-9a-f]+$/i;
  return hexRegex.test(ivHex) && hexRegex.test(authTagHex) && hexRegex.test(encryptedText);
}
