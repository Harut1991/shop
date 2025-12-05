/**
 * Migration: Create promo_codes table
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS promo_codes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          discount_percentage REAL NOT NULL,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          UNIQUE(product_id, name)
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('  ✓ Created promo_codes table');
        resolve();
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('DROP TABLE IF EXISTS promo_codes', (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('  ✓ Dropped promo_codes table');
        resolve();
      });
    });
  }
};


