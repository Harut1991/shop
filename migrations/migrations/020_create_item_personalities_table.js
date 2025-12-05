/**
 * Migration: Create item_personalities junction table
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS item_personalities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_item_id INTEGER NOT NULL,
          personality_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_item_id) REFERENCES product_items(id) ON DELETE CASCADE,
          FOREIGN KEY (personality_id) REFERENCES personalities(id) ON DELETE CASCADE,
          UNIQUE(product_item_id, personality_id)
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Created item_personalities table');
          resolve();
        }
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('DROP TABLE IF EXISTS item_personalities', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Dropped item_personalities table');
          resolve();
        }
      });
    });
  }
};

