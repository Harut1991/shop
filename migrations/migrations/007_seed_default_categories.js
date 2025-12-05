/**
 * Migration: Seed default categories and sub-categories
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      const categories = [
        {
          name: 'THC Potency',
          subCategories: ['Low', 'Medium', 'High']
        },
        {
          name: 'Flower',
          subCategories: ['Pre-Ground', 'Infused', 'Indoor', 'Smalls/Popcorn', 'Sun-grown', 'Ounces', 'Product']
        },
        {
          name: 'Vapes',
          subCategories: ['Cartridges', 'All-In-Ones', 'Pods', 'Live Resin', 'Live Rosin']
        },
        {
          name: 'Edibles',
          subCategories: ['Syrups', 'Gummies', 'Baked Goods', 'Chocolates', 'Sublingual']
        },
        {
          name: 'Pre Roll',
          subCategories: ['Indoor', 'Multi-Pack', 'Blunts', 'Infused']
        },
        {
          name: 'Concentrates',
          subCategories: ['Sauce', 'Live Resin', 'Diamonds', 'Sugar', 'Live Rosin', 'Badder', 'Shatter']
        },
        {
          name: 'Tropicals',
          subCategories: ['Balms']
        },
        {
          name: 'Accessories',
          subCategories: ['Grinders', 'Papers', 'Bongs', 'Pipes', 'Batteries', 'Torches', 'Dab Rigs', 'Lighters']
        }
      ];

      let categoryIndex = 0;

      function insertCategory() {
        if (categoryIndex >= categories.length) {
          console.log('  ✓ Seeded default categories and sub-categories');
          resolve();
          return;
        }

        const category = categories[categoryIndex];
        
        // Check if category already exists
        db.get('SELECT id FROM categories WHERE name = ?', [category.name], (err, existing) => {
          if (err) {
            reject(err);
            return;
          }

          if (existing) {
            // Category exists, get its ID and insert sub-categories
            const categoryId = existing.id;
            insertSubCategories(categoryId, category.subCategories, () => {
              categoryIndex++;
              insertCategory();
            });
          } else {
            // Insert category
            db.run('INSERT INTO categories (name) VALUES (?)', [category.name], function(err) {
              if (err) {
                reject(err);
                return;
              }
              const categoryId = this.lastID;
              insertSubCategories(categoryId, category.subCategories, () => {
                categoryIndex++;
                insertCategory();
              });
            });
          }
        });
      }

      function insertSubCategories(categoryId, subCategories, callback) {
        let subIndex = 0;

        function insertSub() {
          if (subIndex >= subCategories.length) {
            callback();
            return;
          }

          const subName = subCategories[subIndex];
          
          // Check if sub-category already exists
          db.get('SELECT id FROM sub_categories WHERE category_id = ? AND name = ?', [categoryId, subName], (err, existing) => {
            if (err) {
              reject(err);
              return;
            }

            if (!existing) {
              // Insert sub-category
              db.run('INSERT INTO sub_categories (category_id, name) VALUES (?, ?)', [categoryId, subName], (err) => {
                if (err) {
                  reject(err);
                  return;
                }
                subIndex++;
                insertSub();
              });
            } else {
              subIndex++;
              insertSub();
            }
          });
        }

        insertSub();
      }

      insertCategory();
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      // Delete all categories and sub-categories (cascade will handle sub_categories)
      db.run('DELETE FROM categories', (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('  ✓ Removed default categories');
        resolve();
      });
    });
  }
};

