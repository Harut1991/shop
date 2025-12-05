/**
 * Migration: Add product_id column to brands table
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      // Check if product_id column already exists
      db.all("PRAGMA table_info(brands)", (err, columns) => {
        if (err) {
          reject(err);
          return;
        }
        
        const hasProductId = columns.some(col => col.name === 'product_id');
        if (hasProductId) {
          console.log('  ✓ product_id column already exists in brands table');
          resolve();
          return;
        }

        // Check if table exists
        db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='brands'", (err, tables) => {
          if (err) {
            reject(err);
            return;
          }

          if (!tables || tables.length === 0) {
            // Table doesn't exist, create it with the new schema
            db.run(`
              CREATE TABLE IF NOT EXISTS brands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                UNIQUE(product_id, name)
              )
            `, (err) => {
              if (err) {
                reject(err);
              } else {
                console.log('  ✓ Created brands table with product_id');
                resolve();
              }
            });
            return;
          }

          // Table exists but doesn't have product_id column
          // SQLite doesn't support adding NOT NULL columns directly, so we need to recreate the table
          db.serialize(() => {
            // Create new table with product_id
            db.run(`
              CREATE TABLE brands_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                name TEXT NOT NULL,
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

              // Copy existing data (assign to first product if available, or delete if no products)
              db.get('SELECT id FROM products LIMIT 1', (err, product) => {
                if (err) {
                  reject(err);
                  return;
                }

                if (product) {
                  // Copy data with default product_id
                  db.run(`
                    INSERT INTO brands_new (id, product_id, name, created_at, updated_at)
                    SELECT id, ?, name, created_at, updated_at FROM brands
                  `, [product.id], (err) => {
                    if (err) {
                      reject(err);
                      return;
                    }

                    // Drop old table
                    db.run('DROP TABLE brands', (err) => {
                      if (err) {
                        reject(err);
                        return;
                      }

                      // Rename new table
                      db.run('ALTER TABLE brands_new RENAME TO brands', (err) => {
                        if (err) {
                          reject(err);
                        } else {
                          console.log('  ✓ Added product_id column to brands table');
                          resolve();
                        }
                      });
                    });
                  });
                } else {
                  // No products exist, just drop and recreate
                  db.run('DROP TABLE brands', (err) => {
                    if (err) {
                      reject(err);
                      return;
                    }

                    db.run('ALTER TABLE brands_new RENAME TO brands', (err) => {
                      if (err) {
                        reject(err);
                      } else {
                        console.log('  ✓ Recreated brands table with product_id');
                        resolve();
                      }
                    });
                  });
                }
              });
            });
          });
        });
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      // SQLite doesn't support DROP COLUMN directly
      console.log('  ⚠ SQLite does not support DROP COLUMN. Skipping down migration.');
      resolve();
    });
  }
};

