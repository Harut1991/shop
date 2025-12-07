/**
 * Migration: Add customer fields to users table
 * Date: 2024
 * Adds: phone, first_name, last_name columns for customer registration
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      // Check if columns already exist
      db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
          reject(err);
          return;
        }
        
        const hasPhone = columns.some(col => col.name === 'phone');
        const hasFirstName = columns.some(col => col.name === 'first_name');
        const hasLastName = columns.some(col => col.name === 'last_name');
        
        let promises = [];
        
        if (!hasPhone) {
          promises.push(new Promise((resolve, reject) => {
            db.run(`ALTER TABLE users ADD COLUMN phone TEXT`, (err) => {
              if (err) {
                reject(err);
              } else {
                console.log('  ✓ Added phone column to users table');
                resolve();
              }
            });
          }));
        }
        
        if (!hasFirstName) {
          promises.push(new Promise((resolve, reject) => {
            db.run(`ALTER TABLE users ADD COLUMN first_name TEXT`, (err) => {
              if (err) {
                reject(err);
              } else {
                console.log('  ✓ Added first_name column to users table');
                resolve();
              }
            });
          }));
        }
        
        if (!hasLastName) {
          promises.push(new Promise((resolve, reject) => {
            db.run(`ALTER TABLE users ADD COLUMN last_name TEXT`, (err) => {
              if (err) {
                reject(err);
              } else {
                console.log('  ✓ Added last_name column to users table');
                resolve();
              }
            });
          }));
        }
        
        if (promises.length === 0) {
          console.log('  ✓ Customer fields already exist in users table');
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
      console.log('  ⚠ Cannot easily revert customer fields from users table. Manual intervention might be needed.');
      resolve();
    });
  }
};

