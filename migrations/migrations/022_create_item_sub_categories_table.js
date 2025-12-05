/**
 * Migration: Create item_sub_categories junction table
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS item_sub_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_item_id INTEGER NOT NULL,
          sub_category_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_item_id) REFERENCES product_items(id) ON DELETE CASCADE,
          FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id) ON DELETE CASCADE,
          UNIQUE(product_item_id, sub_category_id)
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Created item_sub_categories table');
          resolve();
        }
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('DROP TABLE IF EXISTS item_sub_categories', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Dropped item_sub_categories table');
          resolve();
        }
      });
    });
  }
};

