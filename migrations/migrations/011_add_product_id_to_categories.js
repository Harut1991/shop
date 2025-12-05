/**
 * Migration: Add product_id to categories and sub_categories tables
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      // Add product_id to categories table
      db.run(`
        ALTER TABLE categories ADD COLUMN product_id INTEGER
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          reject(err);
          return;
        }
        console.log('  ✓ Added product_id column to categories table');

        // Add product_id to sub_categories table
        db.run(`
          ALTER TABLE sub_categories ADD COLUMN product_id INTEGER
        `, (err) => {
          if (err && !err.message.includes('duplicate column')) {
            reject(err);
            return;
          }
          console.log('  ✓ Added product_id column to sub_categories table');

          // Update existing categories to be associated with products via product_categories
          // This is a complex migration - we'll assign existing categories to products
          // based on which products have them assigned
          db.all(`
            SELECT DISTINCT pc.product_id, pc.category_id
            FROM product_categories pc
            INNER JOIN categories c ON pc.category_id = c.id
            WHERE c.product_id IS NULL
          `, (err, productCategoryMappings) => {
            if (err) {
              console.log('  ⚠ Could not migrate existing category assignments');
              resolve();
              return;
            }

            // For each product-category pair, create a product-specific category
            let completed = 0;
            const total = productCategoryMappings.length;

            if (total === 0) {
              console.log('  ✓ No existing categories to migrate');
              resolve();
              return;
            }

            productCategoryMappings.forEach(({ product_id, category_id }) => {
              // Get the original category name
              db.get('SELECT name FROM categories WHERE id = ?', [category_id], (err, originalCategory) => {
                if (err || !originalCategory) {
                  completed++;
                  if (completed === total) {
                    console.log('  ✓ Migrated existing categories');
                    resolve();
                  }
                  return;
                }

                // Check if a product-specific category already exists
                db.get('SELECT id FROM categories WHERE product_id = ? AND name = ?', 
                  [product_id, originalCategory.name], 
                  (err, existing) => {
                    if (err) {
                      completed++;
                      if (completed === total) {
                        console.log('  ✓ Migrated existing categories');
                        resolve();
                      }
                      return;
                    }

                    if (!existing) {
                      // Create a new product-specific category
                      db.run('INSERT INTO categories (name, product_id, display_order) SELECT name, ?, display_order FROM categories WHERE id = ?',
                        [product_id, category_id],
                        function(err) {
                          if (err) {
                            console.error('Error creating product-specific category:', err);
                          }
                          completed++;
                          if (completed === total) {
                            console.log('  ✓ Migrated existing categories');
                            resolve();
                          }
                        }
                      );
                    } else {
                      completed++;
                      if (completed === total) {
                        console.log('  ✓ Migrated existing categories');
                        resolve();
                      }
                    }
                  }
                );
              });
            });
          });
        });
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      // SQLite doesn't support DROP COLUMN directly
      // This would require recreating the tables, which is complex
      console.log('  ⚠ Cannot easily remove product_id column in SQLite. Manual intervention required.');
      resolve();
    });
  }
};

