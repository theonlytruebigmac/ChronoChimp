const { db } = require('../src/lib/db');
const { decrypt, encrypt, isEncrypted } = require('../src/lib/encryption');

async function verifyAndFixSecrets() {
    console.log('Starting 2FA secrets verification...');
    
    // Get all users with 2FA enabled
    const users = db.prepare(`
        SELECT id, email, twoFactorSecret 
        FROM users 
        WHERE isTwoFactorEnabled = 1 
        AND twoFactorSecret IS NOT NULL
    `).all();
    
    console.log(`Found ${users.length} users with 2FA enabled`);
    
    let needsReEncryption = [];
    let failed = [];
    
    for (const user of users) {
        try {
            console.log(`\nChecking user ${user.email}...`);
            
            if (!isEncrypted(user.twoFactorSecret)) {
                console.log('Secret is not in encrypted format');
                needsReEncryption.push(user);
                continue;
            }
            
            // Try to decrypt
            try {
                const decrypted = decrypt(user.twoFactorSecret);
                console.log('Successfully decrypted secret');
                
                // Re-encrypt to ensure it's using current key
                const reEncrypted = encrypt(decrypted);
                if (reEncrypted !== user.twoFactorSecret) {
                    console.log('Secret was encrypted with different key');
                    needsReEncryption.push(user);
                }
            } catch (decryptError) {
                console.log('Failed to decrypt:', decryptError.message);
                failed.push(user);
            }
        } catch (error) {
            console.error(`Error processing user ${user.email}:`, error);
            failed.push(user);
        }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Total users checked: ${users.length}`);
    console.log(`Needs re-encryption: ${needsReEncryption.length}`);
    console.log(`Failed to process: ${failed.length}`);
    
    if (needsReEncryption.length > 0 || failed.length > 0) {
        console.log('\nTo fix affected users, run:');
        console.log('node scripts/reencrypt-2fa-secrets.js');
    }
}

verifyAndFixSecrets().catch(console.error);
