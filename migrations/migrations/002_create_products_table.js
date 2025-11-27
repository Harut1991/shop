/**
 * Migration: Create products table
 * Date: Initial migration
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL DEFAULT 0,
          stock INTEGER DEFAULT 0,
          image_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Created products table');
          resolve();
        }
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('DROP TABLE IF EXISTS products', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Dropped products table');
          resolve();
        }
      });
    });
  }
};

