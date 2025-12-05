/**
 * Migration: Add image_url to sub_categories table
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      db.run(`
        ALTER TABLE sub_categories ADD COLUMN image_url TEXT
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          reject(err);
          return;
        }
        console.log('  ✓ Added image_url column to sub_categories table');
        resolve();
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      // SQLite doesn't support dropping columns directly
      // We would need to recreate the table, but for simplicity, we'll just log
      console.log('  ⚠ Cannot easily remove image_url column. Manual intervention might be needed.');
      resolve();
    });
  }
};

