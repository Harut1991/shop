/**
 * Migration: Update orders table status column to include new statuses
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
      db.serialize(() => {
        // Create new table with updated status constraint
        db.run(`
          CREATE TABLE IF NOT EXISTS orders_new (
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
            return;
          }

          // Copy data from old table to new table
          db.run(`
            INSERT INTO orders_new 
            SELECT * FROM orders
          `, (err) => {
            if (err) {
              reject(err);
              return;
            }

            // Drop old table
            db.run('DROP TABLE orders', (err) => {
              if (err) {
                reject(err);
                return;
              }

              // Rename new table to orders
              db.run('ALTER TABLE orders_new RENAME TO orders', (err) => {
                if (err) {
                  reject(err);
                  return;
                }
                console.log('  ✓ Updated orders table status column');
                resolve();
              });
            });
          });
        });
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      // Revert to original status values
      db.serialize(() => {
        db.run(`
          CREATE TABLE IF NOT EXISTS orders_old (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            order_number TEXT UNIQUE NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
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
            return;
          }

          // Map new statuses back to old ones
          db.run(`
            INSERT INTO orders_old 
            SELECT 
              id,
              user_id,
              product_id,
              order_number,
              CASE 
                WHEN status IN ('confirmed', 'preparing', 'arriving') THEN 'in_progress'
                WHEN status = 'rejected' THEN 'cancelled'
                ELSE status
              END as status,
              delivery_address,
              apt_suite,
              scheduled_delivery_datetime,
              bag_type,
              order_request,
              subtotal,
              taxes,
              delivery_fee,
              total,
              created_at,
              updated_at
            FROM orders
          `, (err) => {
            if (err) {
              reject(err);
              return;
            }

            db.run('DROP TABLE orders', (err) => {
              if (err) {
                reject(err);
                return;
              }

              db.run('ALTER TABLE orders_old RENAME TO orders', (err) => {
                if (err) {
                  reject(err);
                  return;
                }
                console.log('  ✓ Reverted orders table status column');
                resolve();
              });
            });
          });
        });
      });
    });
  }
};

