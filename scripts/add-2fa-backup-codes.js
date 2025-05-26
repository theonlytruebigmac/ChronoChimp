// Script to add the two_factor_backup_codes table to the database

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'chrono.db');
console.log(`Updating database schema at: ${dbPath}`);

const db = new Database(dbPath);

try {
  // Begin transaction
  db.prepare('BEGIN TRANSACTION').run();

  // Create the two_factor_backup_codes table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS two_factor_backup_codes (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      hashedCode TEXT NOT NULL,
      used INTEGER DEFAULT 0 NOT NULL,
      usedAt TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_backup_codes_userId ON two_factor_backup_codes(userId);
    CREATE INDEX IF NOT EXISTS idx_backup_codes_used ON two_factor_backup_codes(used);
  `);

  // Check if any users have enabled 2FA but don't have twoFactorSecret
  const incompleteUsers = db.prepare(`
    SELECT id, email FROM users 
    WHERE isTwoFactorEnabled = 1 AND (twoFactorSecret IS NULL OR twoFactorSecret = '')
  `).all();

  if (incompleteUsers.length > 0) {
    console.log(`Found ${incompleteUsers.length} users with incomplete 2FA setup:`);
    incompleteUsers.forEach(user => {
      console.log(`- ${user.email} (${user.id})`);
    });
    
    // Reset 2FA for these users
    db.prepare(`
      UPDATE users 
      SET isTwoFactorEnabled = 0, twoFactorSecret = NULL 
      WHERE isTwoFactorEnabled = 1 AND (twoFactorSecret IS NULL OR twoFactorSecret = '')
    `).run();
    
    console.log('Reset incomplete 2FA setups to avoid locked accounts.');
  }

  // Commit the transaction
  db.prepare('COMMIT').run();
  
  console.log('Database schema updated successfully!');
} catch (error) {
  // Rollback on error
  db.prepare('ROLLBACK').run();
  console.error('Error updating database schema:', error);
  process.exit(1);
} finally {
  // Close the database connection
  db.close();
}
