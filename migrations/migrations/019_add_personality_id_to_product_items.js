/**
 * Migration: Add personality_id to product_items
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      // Check if personality_id column already exists
      db.all("PRAGMA table_info(product_items)", (err, columns) => {
        if (err) {
          reject(err);
          return;
        }
        
        const hasPersonalityId = columns.some(col => col.name === 'personality_id');
        if (hasPersonalityId) {
          console.log('  ✓ personality_id column already exists in product_items table');
          resolve();
          return;
        }

        // Add personality_id column
        db.run(`
          ALTER TABLE product_items 
          ADD COLUMN personality_id INTEGER
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('  ✓ Added personality_id column to product_items table');
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

