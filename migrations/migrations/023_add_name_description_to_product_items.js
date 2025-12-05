/**
 * Migration: Add name and description to product_items table
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      // Check if columns already exist
      db.all("PRAGMA table_info(product_items)", (err, columns) => {
        if (err) {
          reject(err);
          return;
        }
        
        const hasName = columns.some(col => col.name === 'name');
        const hasDescription = columns.some(col => col.name === 'description');
        
        let promises = [];
        
        if (!hasName) {
          promises.push(new Promise((resolve, reject) => {
            db.run(`ALTER TABLE product_items ADD COLUMN name TEXT`, (err) => {
              if (err) {
                reject(err);
              } else {
                console.log('  ✓ Added name column to product_items table');
                resolve();
              }
            });
          }));
        }
        
        if (!hasDescription) {
          promises.push(new Promise((resolve, reject) => {
            db.run(`ALTER TABLE product_items ADD COLUMN description TEXT`, (err) => {
              if (err) {
                reject(err);
              } else {
                console.log('  ✓ Added description column to product_items table');
                resolve();
              }
            });
          }));
        }
        
        if (promises.length === 0) {
          console.log('  ✓ name and description columns already exist in product_items table');
          resolve();
        } else {
          Promise.all(promises)
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      // SQLite does not support dropping columns directly without recreating the table.
      // For simplicity in a 'down' migration, we'll just log a warning.
      console.log('  ⚠ Cannot easily revert name and description columns from product_items table. Manual intervention might be needed.');
      resolve();
    });
  }
};

