/**
 * Migration: Create user_products junction table
 * Date: Initial migration
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS user_products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          UNIQUE(user_id, product_id)
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Created user_products table');
          resolve();
        }
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('DROP TABLE IF EXISTS user_products', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Dropped user_products table');
          resolve();
        }
      });
    });
  }
};

