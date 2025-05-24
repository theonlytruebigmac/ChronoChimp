const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), '.data', 'chrono.db');
const db = new Database(dbPath);

function fixUUIDColumns() {
  console.log('Starting UUID column fixes...');
  
  // Begin transaction
  db.prepare('BEGIN TRANSACTION').run();
  
  try {
    // Backup tasks data
    console.log('Backing up tasks data...');
    const tasks = db.prepare('SELECT * FROM tasks').all();
    
    // Drop and recreate tasks table with proper UUID columns
    console.log('Recreating tasks table with proper UUID columns...');
    db.prepare('DROP TABLE IF EXISTS tasks_old').run();
    db.prepare('ALTER TABLE tasks RENAME TO tasks_old').run();
    
    // Add UUID functions
    db.function('ensure_uuid', (id) => {
      if (!id) return null;
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidPattern.test(id) ? id : null;
    });

    db.function('match_uuid', (id, pattern) => {
      if (!id || !pattern) return 0;
      return id.toLowerCase() === pattern.toLowerCase() ? 1 : 0;
    });
    
    // Create new table with proper UUID columns
    db.prepare(`
      CREATE TABLE tasks (
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
      )
    `).run();
    
    // Restore data
    console.log('Restoring tasks data...');
    const insert = db.prepare(`
      INSERT INTO tasks (
        id, userId, title, description, status, priority, 
        dueDate, startDate, tags, subtasks, timeLogs, 
        notes, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const task of tasks) {
      insert.run(
        task.id,
        task.userId,
        task.title,
        task.description,
        task.status,
        task.priority,
        task.dueDate,
        task.startDate,
        task.tags,
        task.subtasks,
        task.timeLogs,
        task.notes,
        task.createdAt,
        task.updatedAt
      );
    }
    
    // Recreate indices
    console.log('Recreating indices...');
    db.prepare('CREATE INDEX IF NOT EXISTS idx_tasks_userId ON tasks(userId)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_tasks_dueDate ON tasks(dueDate)').run();
    
    // Recreate trigger
    console.log('Recreating trigger...');
    db.prepare(`
      CREATE TRIGGER IF NOT EXISTS update_tasks_updatedAt
      AFTER UPDATE ON tasks
      FOR EACH ROW
      BEGIN
        UPDATE tasks SET updatedAt = (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = OLD.id;
      END;
    `).run();
    
    // Drop backup table
    db.prepare('DROP TABLE tasks_old').run();
    
    // Commit transaction
    db.prepare('COMMIT').run();
    
    console.log('UUID column fixes completed successfully!');
  } catch (error) {
    // Rollback on error
    db.prepare('ROLLBACK').run();
    console.error('Error fixing UUID columns:', error);
    process.exit(1);
  }
}

fixUUIDColumns();
