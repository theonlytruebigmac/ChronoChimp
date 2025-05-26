const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'chrono.db');
console.log(`Creating database at: ${dbPath}`);

const db = new Database(dbPath);

// Add functions to ensure proper UUID handling
db.function('ensure_uuid', (id) => {
  if (!id) return null;
  // UUID pattern: 8-4-4-4-12 chars
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id) ? id : null;
});

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Viewer',
    avatarUrl TEXT,
    isTwoFactorEnabled BOOLEAN DEFAULT FALSE,
    twoFactorSecret TEXT, -- Encrypted using AES-256-GCM
    emailNotificationsEnabled BOOLEAN DEFAULT TRUE,
    inAppNotificationsEnabled BOOLEAN DEFAULT TRUE,
    smtpHost TEXT,
    smtpPort INTEGER,
    smtpEncryption TEXT,
    smtpUsername TEXT,
    smtpPassword TEXT,
    smtpSendFrom TEXT,
    joinedDate TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`);

// Create tasks table
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id CHAR(36) PRIMARY KEY CHECK (ensure_uuid(id) IS NOT NULL),
    userId CHAR(36) NOT NULL CHECK (ensure_uuid(userId) IS NOT NULL),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Backlog',
    priority TEXT DEFAULT 'medium',
    dueDate TEXT,
    startDate TEXT,
    tags TEXT,
    subtasks TEXT,
    timeLogs TEXT,
    notes TEXT,
    createdAt TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    updatedAt TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Create api_keys table
db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    keyPrefix TEXT NOT NULL,
    hashedKey TEXT NOT NULL UNIQUE,
    last4 TEXT NOT NULL,
    createdAt TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    expiresAt TEXT,
    lastUsedAt TEXT,
    revoked INTEGER DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_api_keys_hashedKey ON api_keys(hashedKey);
  CREATE INDEX IF NOT EXISTS idx_api_keys_userId ON api_keys(userId);
  CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(revoked, expiresAt);
`);

// Create password_reset_tokens table
db.exec(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expiresAt TEXT NOT NULL,
    createdAt TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_userId ON password_reset_tokens(userId);
  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expiresAt ON password_reset_tokens(expiresAt);
`);

// Create user_invites table
db.exec(`
  CREATE TABLE IF NOT EXISTS user_invites (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'Viewer',
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    expiresAt TEXT NOT NULL,
    createdAt TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_user_invites_email ON user_invites(email);
  CREATE INDEX IF NOT EXISTS idx_user_invites_status ON user_invites(status);
  CREATE INDEX IF NOT EXISTS idx_user_invites_expiresAt ON user_invites(expiresAt);
`);

// Create two_factor_backup_codes table
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

console.log('Database initialized successfully!');
