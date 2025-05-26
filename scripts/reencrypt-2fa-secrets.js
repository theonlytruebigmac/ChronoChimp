/**
 * Utility script to re-encrypt all 2FA secrets with a new encryption key
 * 
 * Use this script when you need to change your encryption key:
 * 1. Set OLD_ENCRYPTION_KEY to your current key
 * 2. Set ENCRYPTION_KEY to your new key
 * 3. Run this script
 * 
 * Usage: 
 *   OLD_ENCRYPTION_KEY=old-key ENCRYPTION_KEY=new-key node scripts/reencrypt-2fa-secrets.js
 */

const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Get encryption keys from environment variables
const OLD_ENCRYPTION_KEY = process.env.OLD_ENCRYPTION_KEY;
const NEW_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!OLD_ENCRYPTION_KEY) {
  console.error('ERROR: OLD_ENCRYPTION_KEY environment variable is required');
  process.exit(1);
}

if (!NEW_ENCRYPTION_KEY) {
  console.error('ERROR: ENCRYPTION_KEY environment variable is required');
  process.exit(1);
}

// Ensure the keys are exactly 32 bytes (256 bits) for AES-256
let oldKey = Buffer.from(OLD_ENCRYPTION_KEY).slice(0, 32);
if (oldKey.length < 32) {
  const padding = Buffer.alloc(32 - oldKey.length, 0);
  oldKey = Buffer.concat([oldKey, padding]);
}

let newKey = Buffer.from(NEW_ENCRYPTION_KEY).slice(0, 32);
if (newKey.length < 32) {
  const padding = Buffer.alloc(32 - newKey.length, 0);
  newKey = Buffer.concat([newKey, padding]);
}

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'chrono.db');
console.log(`Updating database at: ${dbPath}`);

const db = new Database(dbPath);

// Decryption function with old key
function decrypt(encryptedData, key) {
  try {
    // Split the encrypted data into its components
    const [ivHex, authTagHex, encryptedText] = encryptedData.split(':');
    
    if (!ivHex || !authTagHex || !encryptedText) {
      throw new Error('Invalid encrypted data format');
    }
    
    // Convert hex strings back to buffers
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    
    // Set the auth tag
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

// Encryption function with new key
function encrypt(text, key) {
  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher using AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
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

// Check if data is in encrypted format
function isEncrypted(text) {
  if (!text) return false;
  
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

console.log('Starting 2FA secrets re-encryption...');

try {
  // Get all users with 2FA enabled and encrypted secrets
  const users = db.prepare(`
    SELECT id, email, twoFactorSecret
    FROM users
    WHERE isTwoFactorEnabled = 1 AND twoFactorSecret IS NOT NULL
  `).all();

  console.log(`Found ${users.length} users with 2FA enabled`);

  // Begin transaction
  db.prepare('BEGIN TRANSACTION').run();

  let reencryptedCount = 0;
  let errorCount = 0;

  users.forEach(user => {
    try {
      if (!user.twoFactorSecret) {
        console.log(`User ${user.email} has no 2FA secret, skipping`);
        return;
      }

      if (!isEncrypted(user.twoFactorSecret)) {
        console.log(`User ${user.email} has unencrypted 2FA secret, skipping (run encrypt-2fa-secrets.js first)`);
        return;
      }

      // Decrypt with old key
      const secret = decrypt(user.twoFactorSecret, oldKey);
      
      // Re-encrypt with new key
      const reencryptedSecret = encrypt(secret, newKey);
      
      // Update the database
      db.prepare(`
        UPDATE users
        SET twoFactorSecret = ?, updatedAt = ?
        WHERE id = ?
      `).run(reencryptedSecret, new Date().toISOString(), user.id);
      
      console.log(`Re-encrypted 2FA secret for user ${user.email}`);
      reencryptedCount++;
    } catch (error) {
      console.error(`Error re-encrypting 2FA secret for user ${user.email}:`, error);
      errorCount++;
    }
  });

  // Commit transaction if no errors, otherwise rollback
  if (errorCount === 0) {
    db.prepare('COMMIT').run();
    console.log('Re-encryption completed successfully!');
    console.log(`${reencryptedCount} secrets re-encrypted`);
  } else {
    db.prepare('ROLLBACK').run();
    console.error(`Re-encryption failed with ${errorCount} errors. All changes rolled back.`);
  }
} catch (error) {
  console.error('Error during re-encryption:', error);
  // Ensure transaction is rolled back
  try {
    db.prepare('ROLLBACK').run();
  } catch (rollbackError) {
    console.error('Error during rollback:', rollbackError);
  }
} finally {
  // Close the database
  db.close();
}
