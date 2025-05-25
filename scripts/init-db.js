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
    twoFactorSecret TEXT,
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

console.log('Database initialized successfully!');
