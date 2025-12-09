/**
 * Migration: Create orders table
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          order_number TEXT UNIQUE NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'preparing', 'arriving', 'completed', 'cancelled', 'rejected')),
          delivery_address TEXT NOT NULL,
          apt_suite TEXT,
          scheduled_delivery_datetime TEXT,
          bag_type TEXT NOT NULL CHECK(bag_type IN ('normal', 'discrete')),
          order_request TEXT,
          subtotal REAL NOT NULL,
          taxes REAL NOT NULL DEFAULT 0,
          delivery_fee REAL NOT NULL DEFAULT 0,
          total REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Created orders table');
          resolve();
        }
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('DROP TABLE IF EXISTS orders', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Dropped orders table');
          resolve();
        }
      });
    });
  }
};

