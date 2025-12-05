/**
 * Migration: Create product_items table
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS product_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          weight TEXT NOT NULL,
          price REAL NOT NULL,
          external_product_id TEXT,
          image_url TEXT,
          display_order INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          UNIQUE(product_id, weight)
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Created product_items table');
          resolve();
        }
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('DROP TABLE IF EXISTS product_items', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Dropped product_items table');
          resolve();
        }
      });
    });
  }
};

