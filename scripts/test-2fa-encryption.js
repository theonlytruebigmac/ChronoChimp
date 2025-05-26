/**
 * Test script for 2FA encryption
 * 
 * This script tests the encryption and decryption of 2FA secrets
 */

const crypto = require('crypto');
const path = require('path');
const otplib = require('otplib');

// Get encryption key from environment variable or use a default for development
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'this-is-a-development-key-32-chars';

// Ensure the key is exactly 32 bytes (256 bits) for AES-256
let encryptionKey = Buffer.from(ENCRYPTION_KEY).slice(0, 32);
if (encryptionKey.length < 32) {
  // Pad the key if it's too short
  const padding = Buffer.alloc(32 - encryptionKey.length, 0);
  encryptionKey = Buffer.concat([encryptionKey, padding]);
}

// Encryption functions
function encrypt(text) {
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

function decrypt(encryptedData) {
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
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm', 
      encryptionKey, 
      iv
    );
    
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

// Test encryption and decryption
console.log('Starting encryption test...');
const secret = 'ABCDEFGHIJKLMNOP'; // Sample 2FA secret
console.log('Secret:', secret);

try {
  const encrypted = encrypt(secret);
  console.log('Encrypted successfully:', encrypted);

  const fs = require('fs');
  const results = [];

  results.push('Original: ' + secret);
  results.push('Encrypted: ' + encrypted);
  results.push('Is encrypted: ' + isEncrypted(encrypted));
  results.push('Decrypted: ' + decrypt(encrypted));
  results.push('Verification: ' + (decrypt(encrypted) === secret));

  // Log results to console
  console.log('\nEncryption Testing:');
  results.forEach(result => console.log(result));
} catch (error) {
  console.error('Error during encryption test:', error);
}

// Test validating OTP with encrypted secret
// Mock validateOtp function
function validateOtp(otp, encryptedSecret) {
  try {
    console.log('validateOtp called with:', { otp, encryptedSecret });
    // Decrypt the secret if it's encrypted
    const secret = isEncrypted(encryptedSecret) ? decrypt(encryptedSecret) : encryptedSecret;
    console.log('Using secret for validation:', secret);
    return otplib.authenticator.check(otp, secret);
  } catch (error) {
    console.error('OTP validation error:', error);
    return false;
  }
}

// Generate a test OTP
try {
  const testSecret = 'ABCDEFGHIJKLMNOP';
  console.log('Creating encrypted test secret');
  const encryptedTestSecret = encrypt(testSecret);
  console.log('Generating OTP');
  const testOtp = otplib.authenticator.generate(testSecret);

  console.log('\nOTP Testing:');
  console.log('Test Secret:', testSecret);
  console.log('Encrypted Secret:', encryptedTestSecret);
  console.log('Generated OTP:', testOtp);
  console.log('OTP Valid with encrypted secret:', validateOtp(testOtp, encryptedTestSecret));
  console.log('OTP Valid with plaintext secret:', validateOtp(testOtp, testSecret));
} catch (error) {
  console.error('Error during OTP test:', error);
}
