/**
 * Migration: Fix unique constraint on categories and sub_categories to be product-specific
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      // SQLite doesn't support dropping constraints directly, so we need to recreate the tables
      // First, create new tables with correct constraints
      
      db.run(`
        CREATE TABLE IF NOT EXISTS categories_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          product_id INTEGER,
          display_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(name, product_id)
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('  ✓ Created new categories table with product-specific unique constraint');

        // Copy data from old table to new table
        db.run(`
          INSERT INTO categories_new (id, name, product_id, display_order, created_at)
          SELECT id, name, product_id, display_order, created_at
          FROM categories
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log('  ✓ Copied data to new categories table');

          // Drop old table
          db.run('DROP TABLE categories', (err) => {
            if (err) {
              reject(err);
              return;
            }
            console.log('  ✓ Dropped old categories table');

            // Rename new table
            db.run('ALTER TABLE categories_new RENAME TO categories', (err) => {
              if (err) {
                reject(err);
                return;
              }
              console.log('  ✓ Renamed new categories table');

              // Now do the same for sub_categories
              db.run(`
                CREATE TABLE IF NOT EXISTS sub_categories_new (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  category_id INTEGER NOT NULL,
                  product_id INTEGER,
                  name TEXT NOT NULL,
                  display_order INTEGER DEFAULT 0,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
                  UNIQUE(category_id, product_id, name)
                )
              `, (err) => {
                if (err) {
                  reject(err);
                  return;
                }
                console.log('  ✓ Created new sub_categories table with product-specific unique constraint');

                // Copy data from old table to new table
                db.run(`
                  INSERT INTO sub_categories_new (id, category_id, product_id, name, display_order, created_at)
                  SELECT id, category_id, product_id, name, display_order, created_at
                  FROM sub_categories
                `, (err) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  console.log('  ✓ Copied data to new sub_categories table');

                  // Drop old table
                  db.run('DROP TABLE sub_categories', (err) => {
                    if (err) {
                      reject(err);
                      return;
                    }
                    console.log('  ✓ Dropped old sub_categories table');

                    // Rename new table
                    db.run('ALTER TABLE sub_categories_new RENAME TO sub_categories', (err) => {
                      if (err) {
                        reject(err);
                        return;
                      }
                      console.log('  ✓ Renamed new sub_categories table');
                      resolve();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      // Revert to old constraints (name only, not product-specific)
      // This is complex and might cause data loss, so we'll just log a warning
      console.log('  ⚠ Cannot easily revert unique constraint changes. Manual intervention might be needed.');
      resolve();
    });
  }
};

