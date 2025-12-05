/**
 * Migration: Create personalities table
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS personalities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          image_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          UNIQUE(product_id, name)
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Created personalities table');
          resolve();
        }
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('DROP TABLE IF EXISTS personalities', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Dropped personalities table');
          resolve();
        }
      });
    });
  }
};

