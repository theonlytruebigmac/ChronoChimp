
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'chrono.db');
export const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance.
db.pragma('journal_mode = WAL');

// Create tasks table if it doesn't exist
const createTasksTable = `
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Backlog',
    priority TEXT DEFAULT 'medium',
    dueDate TEXT,
    startDate TEXT,
    tags TEXT, /* JSON string array */
    subtasks TEXT, /* JSON string array of Subtask objects */
    timeLogs TEXT, /* JSON string array of TimeLog objects */
    notes TEXT,
    createdAt TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    updatedAt TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );
`;
db.exec(createTasksTable);

// Add userId column to tasks table if it doesn't exist (for existing databases)
try {
  const stmt = db.prepare(`PRAGMA table_info(tasks)`);
  const existingColumns = stmt.all() as { name: string }[];
  if (!existingColumns.some(ec => ec.name === 'userId')) {
    // console.log(`Adding 'userId' column to 'tasks' table.`); // Removed for cleaner logs
    db.exec(`ALTER TABLE tasks ADD COLUMN userId TEXT`);
  }
} catch (error) {
  console.warn(`Could not check/add column userId to tasks table:`, error);
}


// Create a trigger to update the updatedAt timestamp for tasks
const createTasksUpdatedAtTrigger = `
  CREATE TRIGGER IF NOT EXISTS update_tasks_updatedAt
  AFTER UPDATE ON tasks
  FOR EACH ROW
  BEGIN
    UPDATE tasks SET updatedAt = (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = OLD.id;
  END;
`;
db.exec(createTasksUpdatedAtTrigger);

// Create users table
const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Viewer', -- Admin, Editor, Viewer
    avatarUrl TEXT,
    isTwoFactorEnabled BOOLEAN DEFAULT FALSE,
    twoFactorSecret TEXT, -- CRITICAL: MUST be encrypted at rest in production
    emailNotificationsEnabled BOOLEAN DEFAULT TRUE,
    inAppNotificationsEnabled BOOLEAN DEFAULT TRUE,
    smtpHost TEXT,
    smtpPort INTEGER,
    smtpEncryption TEXT,
    smtpUsername TEXT,
    smtpPassword TEXT, -- CRITICAL: MUST be encrypted at rest in production
    smtpSendFrom TEXT,
    joinedDate TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`;
db.exec(createUsersTable);

// Add columns if they don't exist (migration for existing dbs)
const userColumnsToEnsure = [
  { name: 'isTwoFactorEnabled', type: 'BOOLEAN DEFAULT FALSE' },
  { name: 'twoFactorSecret', type: 'TEXT' }, 
  { name: 'emailNotificationsEnabled', type: 'BOOLEAN DEFAULT TRUE' },
  { name: 'inAppNotificationsEnabled', type: 'BOOLEAN DEFAULT TRUE' },
  { name: 'smtpHost', type: 'TEXT' },
  { name: 'smtpPort', type: 'INTEGER' },
  { name: 'smtpEncryption', type: 'TEXT' },
  { name: 'smtpUsername', type: 'TEXT' },
  { name: 'smtpPassword', type: 'TEXT' }, 
  { name: 'smtpSendFrom', type: 'TEXT' },
];

userColumnsToEnsure.forEach(column => {
  try {
    const stmt = db.prepare(`PRAGMA table_info(users)`);
    const existingColumns = stmt.all() as { name: string }[];
    if (!existingColumns.some(ec => ec.name === column.name)) {
      // console.log(`Adding '${column.name}' column to 'users' table.`); // Removed for cleaner logs
      db.exec(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
    }
  } catch (error) {
    console.warn(`Could not check/add column ${column.name} to users table:`, error);
  }
});


// Create a trigger to update the updatedAt timestamp for users
const createUsersUpdatedAtTrigger = `
  CREATE TRIGGER IF NOT EXISTS update_users_updatedAt
  AFTER UPDATE ON users
  FOR EACH ROW
  BEGIN
    UPDATE users SET updatedAt = (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = OLD.id;
  END;
`;
db.exec(createUsersUpdatedAtTrigger);


// Create api_keys table
const createApiKeysTable = `
  CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    keyPrefix TEXT NOT NULL,
    hashedKey TEXT NOT NULL, -- This is a bcrypt hash of the API key
    last4 TEXT NOT NULL,
    createdAt TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    expiresAt TEXT,
    lastUsedAt TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );
`;
db.exec(createApiKeysTable);

// Create password_reset_tokens table
const createPasswordResetTokensTable = `
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE, -- Stores the HASHED token
    expiresAt TEXT NOT NULL,
    createdAt TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );
`;
db.exec(createPasswordResetTokensTable);

// Create user_invites table
const createUserInvitesTable = `
  CREATE TABLE IF NOT EXISTS user_invites (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE, 
    role TEXT NOT NULL DEFAULT 'Viewer',
    token TEXT NOT NULL UNIQUE, -- Stores the HASHED invite token
    status TEXT NOT NULL DEFAULT 'pending', -- e.g., pending, accepted, expired
    expiresAt TEXT NOT NULL,
    createdAt TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`;
db.exec(createUserInvitesTable);


// console.log('Database initialized and connected at', dbPath); // Removed for cleaner logs in production

// Helper to safely parse JSON
export function safeJSONParse<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (jsonString === null || jsonString === undefined) {
    return defaultValue;
  }
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return defaultValue;
  }
}
