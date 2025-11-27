const bcrypt = require('bcryptjs');

/**
 * Migration: Create default super admin user
 * Date: Initial migration
 */
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      const defaultPassword = bcrypt.hashSync('admin123', 10);
      db.run(`
        INSERT OR IGNORE INTO users (username, email, password, role) 
        VALUES (?, ?, ?, ?)
      `, ['superadmin', 'superadmin@shop.com', defaultPassword, 'super_admin'], (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Created default super admin (username: superadmin, password: admin123)');
          resolve();
        }
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE username = ?', ['superadmin'], (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Removed default super admin');
          resolve();
        }
      });
    });
  }
};

