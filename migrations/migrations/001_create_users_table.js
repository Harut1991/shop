/**
 * Migration: Create users table
 * Date: Initial migration
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Created users table');
          resolve();
        }
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('DROP TABLE IF EXISTS users', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Dropped users table');
          resolve();
        }
      });
    });
  }
};

