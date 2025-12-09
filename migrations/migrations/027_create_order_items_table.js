/**
 * Migration: Create order_items table
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_item_id INTEGER NOT NULL,
          product_item_name TEXT NOT NULL,
          product_item_description TEXT,
          product_item_image_url TEXT,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          subtotal REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (product_item_id) REFERENCES product_items(id) ON DELETE SET NULL
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Created order_items table');
          resolve();
        }
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('DROP TABLE IF EXISTS order_items', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Dropped order_items table');
          resolve();
        }
      });
    });
  }
};

