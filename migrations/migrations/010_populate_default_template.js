/**
 * Migration: Populate default template with all categories and sub-categories
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      // Get the default template
      db.get('SELECT id FROM category_templates WHERE name = ?', ['Default Template'], (err, template) => {
        if (err) {
          reject(err);
          return;
        }

        if (!template) {
          console.log('  ⚠ Default template not found, skipping population');
          resolve();
          return;
        }

        const templateId = template.id;

        // Check if template already has categories
        db.get('SELECT COUNT(*) as count FROM template_categories WHERE template_id = ?', [templateId], (err, result) => {
          if (err) {
            reject(err);
            return;
          }

          if (result.count > 0) {
            console.log('  ✓ Default template already has categories');
            resolve();
            return;
          }

          // Get all categories with their sub-categories
          db.all(`
            SELECT 
              c.id as category_id,
              c.name as category_name,
              c.display_order as category_order,
              sc.id as sub_category_id,
              sc.name as sub_category_name,
              sc.display_order as sub_category_order
            FROM categories c
            LEFT JOIN sub_categories sc ON c.id = sc.category_id
            ORDER BY c.display_order ASC, sc.display_order ASC
          `, (err, results) => {
            if (err) {
              reject(err);
              return;
            }

            if (results.length === 0) {
              console.log('  ⚠ No categories found to add to template');
              resolve();
              return;
            }

            // Group by category
            const categoryMap = {};
            results.forEach(row => {
              if (!categoryMap[row.category_id]) {
                categoryMap[row.category_id] = {
                  categoryId: row.category_id,
                  categoryOrder: row.category_order || 0,
                  subCategories: []
                };
              }
              if (row.sub_category_id) {
                categoryMap[row.category_id].subCategories.push({
                  id: row.sub_category_id,
                  order: row.sub_category_order || 0
                });
              }
            });

            // Insert template categories
            const stmt = db.prepare('INSERT INTO template_categories (template_id, category_id, sub_category_id, display_order) VALUES (?, ?, ?, ?)');
            let completed = 0;
            let hasError = false;
            let total = 0;
            let orderCounter = 1;

            // Calculate total
            Object.values(categoryMap).forEach(cat => {
              if (cat.subCategories.length > 0) {
                total += cat.subCategories.length;
              } else {
                total += 1; // Category without sub-categories
              }
            });

            if (total === 0) {
              stmt.finalize();
              resolve();
              return;
            }

            // Sort categories by order
            const sortedCategories = Object.values(categoryMap).sort((a, b) => a.categoryOrder - b.categoryOrder);

            sortedCategories.forEach(cat => {
              if (cat.subCategories.length > 0) {
                // Sort sub-categories by order
                const sortedSubs = cat.subCategories.sort((a, b) => a.order - b.order);
                sortedSubs.forEach(sub => {
                  stmt.run([templateId, cat.categoryId, sub.id, orderCounter++], (err) => {
                    if (err && !hasError) {
                      hasError = true;
                      stmt.finalize();
                      return reject(err);
                    }
                    completed++;
                    if (completed === total && !hasError) {
                      stmt.finalize();
                      console.log('  ✓ Populated default template with categories');
                      resolve();
                    }
                  });
                });
              } else {
                // Category without sub-categories
                stmt.run([templateId, cat.categoryId, null, orderCounter++], (err) => {
                  if (err && !hasError) {
                    hasError = true;
                    stmt.finalize();
                    return reject(err);
                  }
                  completed++;
                  if (completed === total && !hasError) {
                    stmt.finalize();
                    console.log('  ✓ Populated default template with categories');
                    resolve();
                  }
                });
              }
            });
          });
        });
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT id FROM category_templates WHERE name = ?', ['Default Template'], (err, template) => {
        if (err || !template) {
          resolve();
          return;
        }

        db.run('DELETE FROM template_categories WHERE template_id = ?', [template.id], (err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log('  ✓ Removed categories from default template');
          resolve();
        });
      });
    });
  }
};

