/**
 * Migration: Create category_templates table
 * Date: 2024
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      // Create category_templates table
      db.run(`
        CREATE TABLE IF NOT EXISTS category_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('  ✓ Created category_templates table');

        // Create template_categories junction table
        db.run(`
          CREATE TABLE IF NOT EXISTS template_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            sub_category_id INTEGER,
            display_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (template_id) REFERENCES category_templates(id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
            FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id) ON DELETE CASCADE,
            UNIQUE(template_id, category_id, sub_category_id)
          )
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log('  ✓ Created template_categories table');
          
          // Create default template with all categories
          db.run(`
            INSERT INTO category_templates (name, description) 
            VALUES ('Default Template', 'Default template with all categories and sub-categories')
          `, function(err) {
            if (err && !err.message.includes('UNIQUE constraint')) {
              reject(err);
              return;
            }
            console.log('  ✓ Created default category template');
            resolve();
          });
        });
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('DROP TABLE IF EXISTS template_categories', (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('  ✓ Dropped template_categories table');
        
        db.run('DROP TABLE IF EXISTS category_templates', (err) => {
          if (err) {
            reject(err);
            return;
          }
          console.log('  ✓ Dropped category_templates table');
          resolve();
        });
      });
    });
  }
};

