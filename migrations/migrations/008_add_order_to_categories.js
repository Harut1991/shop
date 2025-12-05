/**
 * Migration: Add order field to categories and sub_categories
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      // Check if order column exists in categories
      db.all("PRAGMA table_info(categories)", (err, columns) => {
        if (err) {
          reject(err);
          return;
        }
        
        const hasOrder = columns.some(col => col.name === 'display_order');
        if (!hasOrder) {
          db.run('ALTER TABLE categories ADD COLUMN display_order INTEGER DEFAULT 0', (err) => {
            if (err) {
              reject(err);
              return;
            }
            console.log('  ✓ Added display_order to categories table');
          });
        }

        // Check if order column exists in sub_categories
        db.all("PRAGMA table_info(sub_categories)", (err, subColumns) => {
          if (err) {
            reject(err);
            return;
          }
          
          const hasSubOrder = subColumns.some(col => col.name === 'display_order');
          if (!hasSubOrder) {
            db.run('ALTER TABLE sub_categories ADD COLUMN display_order INTEGER DEFAULT 0', (err) => {
              if (err) {
                reject(err);
                return;
              }
              console.log('  ✓ Added display_order to sub_categories table');
              
              // Set initial order based on creation order
              db.run('UPDATE categories SET display_order = id', (err) => {
                if (err) console.error('Error setting initial category order:', err);
              });
              
              db.run('UPDATE sub_categories SET display_order = id', (err) => {
                if (err) {
                  console.error('Error setting initial sub-category order:', err);
                } else {
                  resolve();
                }
              });
            });
          } else {
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

