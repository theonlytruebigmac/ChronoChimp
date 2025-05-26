/**
 * Simple test script
 */

console.log('Starting simple test...');

try {
  const crypto = require('crypto');
  console.log('Crypto loaded');
  
  const otplib = require('otplib');
  console.log('OTP lib loaded');
  
  // Generate a test secret
  const secret = 'ABCDEFGHIJKLMNOP';
  console.log('Secret:', secret);
  
  // Generate OTP
  const otp = otplib.authenticator.generate(secret);
  console.log('OTP:', otp);
  
  // Verify OTP
  const isValid = otplib.authenticator.check(otp, secret);
  console.log('Is valid:', isValid);
  
} catch (error) {
  console.error('Error:', error);
}

console.log('Test completed');
