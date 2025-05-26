/**
 * Migration script to encrypt existing 2FA secrets
 * 
 * This script finds all users with unencrypted 2FA secrets and encrypts them
 */

const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Get encryption key from environment variable or use a default for development
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'this-is-a-development-key-32-chars';

// Ensure the key is exactly 32 bytes (256 bits) for AES-256
let key = Buffer.from(ENCRYPTION_KEY).slice(0, 32);
if (key.length < 32) {
  // Pad the key if it's too short
  const padding = Buffer.alloc(32 - key.length, 0);
  key = Buffer.concat([key, padding]);
}

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'chrono.db');
console.log(`Updating database at: ${dbPath}`);

const db = new Database(dbPath);

// Encryption functions
function encrypt(text) {
  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher using AES-256-GCM
    const cipher = crypto.createCipheriv(
      'aes-256-gcm', 
      key, 
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

function isEncrypted(text) {
  // Check if the string matches our encryption format (iv:authTag:encryptedText)
  // Each part should be a valid hex string
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

console.log('Starting 2FA secrets encryption migration...');

// Check if any users have enabled 2FA with unencrypted secrets
const users = db.prepare(`
  SELECT id, email, twoFactorSecret
  FROM users
  WHERE isTwoFactorEnabled = 1 AND twoFactorSecret IS NOT NULL
`).all();

console.log(`Found ${users.length} users with 2FA enabled`);

if (users.length === 0) {
  console.log('No users with 2FA enabled found. Nothing to migrate.');
  process.exit(0);
}

// Start a transaction to ensure all updates are atomic
db.prepare('BEGIN TRANSACTION').run();

try {
  let encryptedCount = 0;
  let alreadyEncryptedCount = 0;
  
  for (const user of users) {
    if (!user.twoFactorSecret) {
      console.log(`User ${user.email} has 2FA enabled but no secret. Skipping.`);
      continue;
    }
    
    // Check if the secret is already encrypted
    if (isEncrypted(user.twoFactorSecret)) {
      console.log(`User ${user.email} already has an encrypted 2FA secret.`);
      alreadyEncryptedCount++;
      continue;
    }
    
    // Encrypt the secret
    const encryptedSecret = encrypt(user.twoFactorSecret);
    
    // Update the user's record with the encrypted secret
    const updateStmt = db.prepare(`
      UPDATE users
      SET twoFactorSecret = ?, updatedAt = ?
      WHERE id = ?
    `);
    
    updateStmt.run(encryptedSecret, new Date().toISOString(), user.id);
    console.log(`Encrypted 2FA secret for user ${user.email}`);
    encryptedCount++;
  }
  
  // Commit the transaction
  db.prepare('COMMIT').run();
  
  console.log(`Migration completed successfully!`);
  console.log(`${encryptedCount} secrets encrypted`);
  console.log(`${alreadyEncryptedCount} secrets were already encrypted`);
  
} catch (error) {
  // Rollback on error
  db.prepare('ROLLBACK').run();
  console.error('Error during migration:', error);
  process.exit(1);
}
