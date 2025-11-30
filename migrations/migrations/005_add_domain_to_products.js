/**
 * Migration: Add domain column to products table
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      // Check if column already exists
      db.all("PRAGMA table_info(products)", (err, columns) => {
        if (err) {
          reject(err);
          return;
        }
        
        const hasDomain = columns.some(col => col.name === 'domain');
        if (hasDomain) {
          console.log('  ✓ Domain column already exists in products table');
          resolve();
          return;
        }

        // Add domain column
        db.run(`
          ALTER TABLE products 
          ADD COLUMN domain TEXT
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('  ✓ Added domain column to products table');
            resolve();
          }
        });
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      // SQLite doesn't support DROP COLUMN directly, so we'll skip the down migration
      // In production, you would need to recreate the table
      console.log('  ⚠ SQLite does not support DROP COLUMN. Skipping down migration.');
      resolve();
    });
  }
};

