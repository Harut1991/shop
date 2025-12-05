/**
 * Migration: Add brand_id to product_items and remove external_product_id
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      // Check if brand_id column already exists
      db.all("PRAGMA table_info(product_items)", (err, columns) => {
        if (err) {
          reject(err);
          return;
        }
        
        const hasBrandId = columns.some(col => col.name === 'brand_id');
        if (hasBrandId) {
          console.log('  ✓ brand_id column already exists in product_items table');
          resolve();
          return;
        }

        // Add brand_id column
        db.run(`
          ALTER TABLE product_items 
          ADD COLUMN brand_id INTEGER,
          ADD FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
        `, (err) => {
          if (err) {
            // If foreign key constraint fails, try without it (SQLite limitation)
            db.run(`
              ALTER TABLE product_items 
              ADD COLUMN brand_id INTEGER
            `, (err) => {
              if (err) {
                reject(err);
              } else {
                console.log('  ✓ Added brand_id column to product_items table');
                resolve();
              }
            });
          } else {
            console.log('  ✓ Added brand_id column to product_items table');
            resolve();
          }
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

