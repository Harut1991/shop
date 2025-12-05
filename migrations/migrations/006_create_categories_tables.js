/**
 * Migration: Create categories and sub_categories tables
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      // Create categories table
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('  ✓ Created categories table');

        // Create sub_categories table
        db.run(`
          CREATE TABLE IF NOT EXISTS sub_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
            UNIQUE(category_id, name)
          )
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log('  ✓ Created sub_categories table');

          // Create product_categories junction table (for categories assigned to products)
          db.run(`
            CREATE TABLE IF NOT EXISTS product_categories (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              product_id INTEGER NOT NULL,
              category_id INTEGER NOT NULL,
              sub_category_id INTEGER,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
              FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
              FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id) ON DELETE CASCADE,
              UNIQUE(product_id, category_id, sub_category_id)
            )
          `, (err) => {
            if (err) {
              reject(err);
              return;
            }
            console.log('  ✓ Created product_categories table');
            resolve();
          });
        });
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('DROP TABLE IF EXISTS product_categories', (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('  ✓ Dropped product_categories table');
        
        db.run('DROP TABLE IF EXISTS sub_categories', (err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log('  ✓ Dropped sub_categories table');
          
          db.run('DROP TABLE IF EXISTS categories', (err) => {
            if (err) {
              reject(err);
              return;
            }
            console.log('  ✓ Dropped categories table');
            resolve();
          });
        });
      });
    });
  }
};

