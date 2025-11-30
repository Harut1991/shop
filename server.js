const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const path = require('path');

app.use(cors());
app.use(express.json());

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
}

// Initialize database - use absolute path in production for persistence
const dbPath = process.env.DATABASE_PATH || './shop.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    runMigrations();
  }
});

// Run database migrations
async function runMigrations() {
  const MigrationRunner = require('./migrations/migrate');
  const runner = new MigrationRunner(dbPath);
  
  try {
    await runner.runMigrations();
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Migration error:', error);
    // Fallback to old initialization for backward compatibility
    console.log('Falling back to legacy database initialization...');
    initializeDatabase();
  }
}

// Legacy database initialization (kept for backward compatibility)
// New deployments should use migrations instead
function initializeDatabase() {
  // Users table with role: 'super_admin', 'admin', 'user'
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('Users table ready');
      createDefaultAdmin();
    }
  });

  // Products table
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating products table:', err.message);
    } else {
      console.log('Products table ready');
      createUserProductsTable();
    }
  });
}

// Create user_products junction table
function createUserProductsTable() {
  db.run(`CREATE TABLE IF NOT EXISTS user_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(user_id, product_id)
  )`, (err) => {
    if (err) {
      console.error('Error creating user_products table:', err.message);
    } else {
      console.log('User_products table ready');
    }
  });
}

// Create default super admin
function createDefaultAdmin() {
  const defaultPassword = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, email, password, role) 
    VALUES (?, ?, ?, ?)`,
    ['superadmin', 'superadmin@shop.com', defaultPassword, 'super_admin'],
    (err) => {
      if (err) {
        console.error('Error creating default admin:', err.message);
      } else {
        console.log('Default super admin created (username: superadmin, password: admin123)');
      }
    }
  );
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to check if user is admin or super admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !username.trim() || !password || !password.trim()) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const trimmedUsername = username.trim();
    const userEmail = (email && email.trim()) || null;
    db.run(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [trimmedUsername, userEmail, hashedPassword, 'user'],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Error creating user' });
        }
        const userId = this.lastID;
        
        // Assign first available product to new user (if any exists)
        db.get('SELECT id FROM products LIMIT 1', (err, product) => {
          if (!err && product) {
            db.run('INSERT INTO user_products (user_id, product_id) VALUES (?, ?)', [userId, product.id], () => {
              // Continue even if assignment fails
            });
          }
          
          const token = jwt.sign(
            { id: userId, username, email, role: 'user' },
            JWT_SECRET,
            { expiresIn: '24h' }
          );
          res.status(201).json({ token, user: { id: userId, username, email, role: 'user' } });
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password, domain } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (!domain || !domain.trim()) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  const trimmedDomain = domain.trim();

  db.get(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [username, username],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Super admin can login from any domain
      if (user.role === 'super_admin') {
        const token = jwt.sign(
          { id: user.id, username: user.username, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        return res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        });
      }

      // For non-super-admin users, check if they have access to a product with this domain
      // First, get the product ID for this domain
      db.get('SELECT id FROM products WHERE LOWER(domain) = LOWER(?)', [trimmedDomain], (err, product) => {
        if (err) {
          return res.status(500).json({ error: 'Error checking domain' });
        }
        if (!product) {
          return res.status(403).json({ error: 'No product found for this domain' });
        }

        // Check if user has access to this product
        db.get(
          'SELECT * FROM user_products WHERE user_id = ? AND product_id = ?',
          [user.id, product.id],
          (err, userProduct) => {
            if (err) {
              return res.status(500).json({ error: 'Error checking product access' });
            }
            if (!userProduct) {
              return res.status(403).json({ error: 'You do not have access to this domain' });
            }

            // User has access, create token
            const token = jwt.sign(
              { id: user.id, username: user.username, email: user.email, role: user.role },
              JWT_SECRET,
              { expiresIn: '24h' }
            );

            res.json({
              token,
              user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
              }
            });
          }
        );
      });
    }
  );
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Admin Routes - Get all users with their products (admin and super admin only)
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  const currentUser = req.user;
  
  // Super admin can see all users
  if (currentUser.role === 'super_admin') {
    db.all('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC', (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching users' });
      }
      
      // Get products for each user
      const usersWithProducts = users.map(user => {
        return new Promise((resolve) => {
          db.all(
            `SELECT p.id, p.name, p.description, p.price, p.stock, p.image_url 
             FROM products p 
             INNER JOIN user_products up ON p.id = up.product_id 
             WHERE up.user_id = ?`,
            [user.id],
            (err, products) => {
              if (err) {
                resolve({ ...user, products: [] });
              } else {
                resolve({ ...user, products: products || [] });
              }
            }
          );
        });
      });
      
      Promise.all(usersWithProducts).then(usersData => {
        res.json({ users: usersData });
      });
    });
  } else {
    // Regular admin: only see users where admin has access to ALL of their products (excluding super_admin)
    // First, get all products the admin has access to
    db.all(
      `SELECT product_id FROM user_products WHERE user_id = ?`,
      [currentUser.id],
      (err, adminProducts) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching admin products' });
        }
        
        if (adminProducts.length === 0) {
          return res.json({ users: [] });
        }
        
        const adminProductIds = adminProducts.map(p => p.product_id);
        const placeholders = adminProductIds.map(() => '?').join(',');
        
        // Find all users (excluding super_admin) that have at least one product
        db.all(
          `SELECT DISTINCT u.id, u.username, u.email, u.role, u.created_at 
           FROM users u
           INNER JOIN user_products up ON u.id = up.user_id
           WHERE u.role != 'super_admin'
           ORDER BY u.created_at DESC`,
          [],
          (err, users) => {
            if (err) {
              return res.status(500).json({ error: 'Error fetching users' });
            }
            
            // For each user, check if admin has access to ALL of their products
            const usersWithProducts = users.map(user => {
              return new Promise((resolve) => {
                // Get all products for this user
                db.all(
                  `SELECT p.id, p.name, p.description, p.price, p.stock, p.image_url 
                   FROM products p 
                   INNER JOIN user_products up ON p.id = up.product_id 
                   WHERE up.user_id = ?`,
                  [user.id],
                  (err, userProducts) => {
                    if (err) {
                      resolve(null); // Skip this user on error
                      return;
                    }
                    
                    // If user has no products, skip them
                    if (!userProducts || userProducts.length === 0) {
                      resolve(null);
                      return;
                    }
                    
                    // Check if admin has access to ALL of this user's products
                    const userProductIds = userProducts.map(p => p.id);
                    const allProductsAccessible = userProductIds.every(productId => 
                      adminProductIds.includes(productId)
                    );
                    
                    // Only include user if admin has access to all their products
                    if (allProductsAccessible) {
                      resolve({ ...user, products: userProducts });
                    } else {
                      resolve(null); // Admin doesn't have access to all products
                    }
                  }
                );
              });
            });
            
            Promise.all(usersWithProducts).then(usersData => {
              // Filter out null values (users admin doesn't have full access to)
              const filteredUsers = usersData.filter(user => user !== null);
              res.json({ users: filteredUsers });
            });
          }
        );
      }
    );
  }
});

// Admin Routes - Update user role (admin and super admin)
app.put('/api/admin/users/:id/role', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['super_admin', 'admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // Regular admin cannot change users to super_admin or change super_admin users
  db.get('SELECT role FROM users WHERE id = ?', [id], (err, targetUser) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking user' });
    }
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user.role !== 'super_admin') {
      // Regular admin cannot change role to super_admin
      if (role === 'super_admin') {
        return res.status(403).json({ error: 'Only super admin can assign super admin role' });
      }
      // Regular admin cannot change super_admin users
      if (targetUser.role === 'super_admin') {
        return res.status(403).json({ error: 'Cannot modify super admin users' });
      }
      
      // Regular admin can only edit users they have access to (users with shared products)
      db.get(
        `SELECT COUNT(*) as shared_count FROM user_products up1
         INNER JOIN user_products up2 ON up1.product_id = up2.product_id
         WHERE up1.user_id = ? AND up2.user_id = ?`,
        [req.user.id, id],
        (err, sharedResult) => {
          if (err) {
            return res.status(500).json({ error: 'Error checking user access' });
          }
          // Check if target user has any products
          db.get('SELECT COUNT(*) as count FROM user_products WHERE user_id = ?', [id], (err, userProductsResult) => {
            if (err) {
              return res.status(500).json({ error: 'Error checking user products' });
            }
            // If user has products but admin doesn't share any, deny access
            if (userProductsResult.count > 0 && sharedResult.shared_count === 0) {
              return res.status(403).json({ error: 'You can only edit users with shared product access' });
            }
            continueRoleUpdate();
          });
        }
      );
    } else {
      continueRoleUpdate();
    }

    function continueRoleUpdate() {
      // If changing to non-super-admin role, ensure user has at least one product
      if (role !== 'super_admin') {
        db.get('SELECT COUNT(*) as count FROM user_products WHERE user_id = ?', [id], (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Error checking user products' });
          }
          if (result.count === 0) {
            return res.status(400).json({ error: 'User must have at least one product assigned before changing to this role' });
          }
          
          updateUserRole();
        });
      } else {
        // If changing to super_admin, remove all product assignments
        db.run('DELETE FROM user_products WHERE user_id = ?', [id], (err) => {
          if (err) {
            return res.status(500).json({ error: 'Error removing product assignments' });
          }
          updateUserRole();
        });
      }

      function updateUserRole() {
        db.run(
          'UPDATE users SET role = ? WHERE id = ?',
          [role, id],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Error updating user role' });
            }
            if (this.changes === 0) {
              return res.status(404).json({ error: 'User not found' });
            }
            res.json({ message: 'User role updated successfully' });
          }
        );
      }
    }
  });
});

// Admin Routes - Update user (email and password) (admin and super admin)
app.put('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { email, password } = req.body;

  // Validate at least one field is provided
  if (!email && !password) {
    return res.status(400).json({ error: 'At least email or password must be provided' });
  }

  // Check if user exists
  db.get('SELECT role FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking user' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Regular admin cannot edit super_admin users
    if (req.user.role !== 'super_admin' && user.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot edit super admin users' });
    }

    // Regular admin can only edit users they have access to (users with shared products)
    if (req.user.role !== 'super_admin') {
      db.get(
        `SELECT COUNT(*) as shared_count FROM user_products up1
         INNER JOIN user_products up2 ON up1.product_id = up2.product_id
         WHERE up1.user_id = ? AND up2.user_id = ?`,
        [req.user.id, id],
        (err, sharedResult) => {
          if (err) {
            return res.status(500).json({ error: 'Error checking user access' });
          }
          // Check if target user has any products
          db.get('SELECT COUNT(*) as count FROM user_products WHERE user_id = ?', [id], (err, userProductsResult) => {
            if (err) {
              return res.status(500).json({ error: 'Error checking user products' });
            }
            // If user has products but admin doesn't share any, deny access
            if (userProductsResult.count > 0 && sharedResult.shared_count === 0) {
              return res.status(403).json({ error: 'You can only edit users with shared product access' });
            }
            updateUser();
          });
        }
      );
    } else {
      updateUser();
    }

    function updateUser() {
      const updates = [];
      const values = [];

      if (email !== undefined) {
        const trimmedEmail = email.trim() || null;
        updates.push('email = ?');
        values.push(trimmedEmail);
      }

      if (password && password.trim()) {
        const hashedPassword = bcrypt.hashSync(password.trim(), 10);
        updates.push('password = ?');
        values.push(hashedPassword);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      values.push(id);

      db.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint')) {
              return res.status(400).json({ error: 'Email already exists' });
            }
            return res.status(500).json({ error: 'Error updating user' });
          }
          if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
          }
          res.json({ message: 'User updated successfully' });
        }
      );
    }
  });
});

// Admin Routes - Delete user (admin and super admin)
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  // Regular admin cannot delete super_admin users
  db.get('SELECT role FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking user' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user.role !== 'super_admin' && user.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot delete super admin users' });
    }

    // Regular admin can only delete users they have access to (users with shared products)
    if (req.user.role !== 'super_admin') {
      // Check if admin and target user share at least one product
      db.get(
        `SELECT COUNT(*) as count FROM user_products up1
         INNER JOIN user_products up2 ON up1.product_id = up2.product_id
         WHERE up1.user_id = ? AND up2.user_id = ?`,
        [req.user.id, id],
        (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Error checking product access' });
          }
          if (result.count === 0) {
            return res.status(403).json({ error: 'You can only delete users with shared product access' });
          }
          deleteUser();
        }
      );
    } else {
      deleteUser();
    }
  });

  function deleteUser() {
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error deleting user' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ message: 'User deleted successfully' });
    });
  }
});

// Admin Routes - Create user (admin and super admin)
app.post('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  const { username, password, email, role, productIds } = req.body;

  // Validate required fields
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }

  if (!password || !password.trim()) {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (!['super_admin', 'admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // Regular admin cannot create super_admin users
  if (req.user.role !== 'super_admin' && role === 'super_admin') {
    return res.status(403).json({ error: 'Only super admin can create super admin users' });
  }

  // If regular admin has only one product, auto-assign it if not provided
  let finalProductIds = productIds || [];
  if (role !== 'super_admin' && req.user.role !== 'super_admin') {
    db.all('SELECT product_id FROM user_products WHERE user_id = ?', [req.user.id], (err, adminProducts) => {
      if (err) {
        return res.status(500).json({ error: 'Error checking admin products' });
      }
      
      // If admin has only one product and no productIds provided, auto-assign it
      if (adminProducts.length === 1 && (!productIds || productIds.length === 0)) {
        finalProductIds = [adminProducts[0].product_id];
      }
      
      // If not super_admin, products are required
      if (role !== 'super_admin' && finalProductIds.length === 0) {
        return res.status(400).json({ error: 'User must have at least one product assigned' });
      }
      
      continueValidation();
    });
  } else {
    // If not super_admin, products are required
    if (role !== 'super_admin' && finalProductIds.length === 0) {
      return res.status(400).json({ error: 'User must have at least one product assigned' });
    }
    continueValidation();
  }

  function continueValidation() {

    const trimmedUsername = username.trim();
    const userEmail = (email && email.trim()) || null; // Allow null email

    // Validate that product IDs exist and admin has access to them (if not super admin)
    if (role !== 'super_admin' && finalProductIds && finalProductIds.length > 0) {
      // First validate products exist
      const placeholders = finalProductIds.map(() => '?').join(',');
      db.all(`SELECT id FROM products WHERE id IN (${placeholders})`, finalProductIds, (err, existingProducts) => {
        if (err) {
          return res.status(500).json({ error: 'Error validating products' });
        }
        if (existingProducts.length !== finalProductIds.length) {
          return res.status(400).json({ error: 'One or more product IDs are invalid' });
        }

        // If regular admin, validate they have access to all products being assigned
        if (req.user.role !== 'super_admin') {
          db.all(
            `SELECT product_id FROM user_products WHERE user_id = ? AND product_id IN (${placeholders})`,
            [req.user.id, ...finalProductIds],
          (err, adminProducts) => {
            if (err) {
              return res.status(500).json({ error: 'Error validating product access' });
            }
            if (adminProducts.length !== finalProductIds.length) {
              return res.status(403).json({ error: 'You can only assign products you have access to' });
            }
            createUser();
          }
          );
        } else {
          createUser();
        }
      });
    } else {
      createUser();
    }

    function createUser() {
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [trimmedUsername, userEmail, hashedPassword, role],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Error creating user' });
        }
        const userId = this.lastID;

        // Assign products if not super_admin
        if (role !== 'super_admin' && finalProductIds && finalProductIds.length > 0) {
          const stmt = db.prepare('INSERT INTO user_products (user_id, product_id) VALUES (?, ?)');
          let completed = 0;
          let hasError = false;

          finalProductIds.forEach((productId) => {
            stmt.run([userId, productId], (err) => {
              if (err && !hasError) {
                hasError = true;
              }
              completed++;
              if (completed === finalProductIds.length) {
                stmt.finalize();
                if (hasError) {
                  return res.status(500).json({ error: 'User created but some product assignments failed' });
                }
                res.status(201).json({ message: 'User created successfully', userId });
              }
            });
          });
        } else {
          res.status(201).json({ message: 'User created successfully', userId });
        }
      }
    );
    }
  }
});

// Admin Routes - Assign products to user (admin and super admin)
app.post('/api/admin/users/:id/products', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { productIds } = req.body;

  if (!Array.isArray(productIds)) {
    return res.status(400).json({ error: 'productIds must be an array' });
  }

  // Check if user is super_admin (can't assign products to super_admin)
  db.get('SELECT role FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking user' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.role === 'super_admin') {
      return res.status(400).json({ error: 'Cannot assign products to super admin' });
    }

    // Regular admin cannot assign products to users they don't have access to
    if (req.user.role !== 'super_admin') {
      // Check if admin and target user share at least one product (or if target user has no products yet)
      db.get(
        `SELECT COUNT(*) as shared_count FROM user_products up1
         INNER JOIN user_products up2 ON up1.product_id = up2.product_id
         WHERE up1.user_id = ? AND up2.user_id = ?`,
        [req.user.id, id],
        (err, sharedResult) => {
          if (err) {
            return res.status(500).json({ error: 'Error checking user access' });
          }
          // Check if target user has any products
          db.get('SELECT COUNT(*) as count FROM user_products WHERE user_id = ?', [id], (err, userProductsResult) => {
            if (err) {
              return res.status(500).json({ error: 'Error checking user products' });
            }
            // If user has products but admin doesn't share any, deny access
            if (userProductsResult.count > 0 && sharedResult.shared_count === 0) {
              return res.status(403).json({ error: 'You can only assign products to users with shared product access' });
            }
            validateAndAssign();
          });
        }
      );
    } else {
      validateAndAssign();
    }

    function validateAndAssign() {
      // Validate that non-super-admin users have at least one product
      if (user.role !== 'super_admin' && productIds.length === 0) {
        return res.status(400).json({ error: 'User must have at least one product assigned' });
      }

      // Validate that all product IDs exist
      if (productIds.length > 0) {
        const placeholders = productIds.map(() => '?').join(',');
        db.all(`SELECT id FROM products WHERE id IN (${placeholders})`, productIds, (err, existingProducts) => {
          if (err) {
            return res.status(500).json({ error: 'Error validating products' });
          }
          if (existingProducts.length !== productIds.length) {
            return res.status(400).json({ error: 'One or more product IDs are invalid' });
          }

          // If regular admin, validate they have access to all products being assigned
          if (req.user.role !== 'super_admin') {
            db.all(
              `SELECT product_id FROM user_products WHERE user_id = ? AND product_id IN (${placeholders})`,
              [req.user.id, ...productIds],
              (err, adminProducts) => {
                if (err) {
                  return res.status(500).json({ error: 'Error validating product access' });
                }
                if (adminProducts.length !== productIds.length) {
                  return res.status(403).json({ error: 'You can only assign products you have access to' });
                }
                assignProducts();
              }
            );
          } else {
            assignProducts();
          }
        });
      } else {
        assignProducts();
      }
    }

    function assignProducts() {
      // Remove existing assignments
      db.run('DELETE FROM user_products WHERE user_id = ?', [id], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Error removing existing assignments' });
        }

        // Insert new assignments
        if (productIds.length === 0) {
          return res.json({ message: 'Products assigned successfully' });
        }

        const stmt = db.prepare('INSERT INTO user_products (user_id, product_id) VALUES (?, ?)');
        let completed = 0;
        let hasError = false;

        productIds.forEach((productId) => {
          stmt.run([id, productId], (err) => {
            if (err && !hasError) {
              hasError = true;
              stmt.finalize();
              return res.status(500).json({ error: 'Error assigning products' });
            }
            completed++;
            if (completed === productIds.length && !hasError) {
              stmt.finalize();
              res.json({ message: 'Products assigned successfully' });
            }
          });
        });
      });
    }
  });
});

// Admin Routes - Get all products (for assignment dropdown)
app.get('/api/admin/products', authenticateToken, requireAdmin, (req, res) => {
  const currentUser = req.user;
  
  // Super admin can see all products
  if (currentUser.role === 'super_admin') {
    db.all('SELECT * FROM products ORDER BY name ASC', (err, products) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching products' });
      }
      res.json({ products });
    });
  } else {
    // Regular admin can only see products they have access to
    db.all(
      `SELECT p.* FROM products p
       INNER JOIN user_products up ON p.id = up.product_id
       WHERE up.user_id = ?
       ORDER BY p.name ASC`,
      [currentUser.id],
      (err, products) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching products' });
        }
        res.json({ products });
      }
    );
  }
});

// Products Routes - Filter by user role
app.get('/api/products', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  // Super admin can see all products
  if (userRole === 'super_admin') {
    db.all('SELECT * FROM products ORDER BY created_at DESC', (err, products) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching products' });
      }
      res.json({ products });
    });
  } else {
    // Other users only see their assigned products
    // First, clean up orphaned user_products entries (where product no longer exists)
    db.run(
      `DELETE FROM user_products 
       WHERE user_id = ? 
       AND product_id NOT IN (SELECT id FROM products)`,
      [userId],
      (cleanupErr) => {
        // Continue even if cleanup fails
        if (cleanupErr) {
          console.error('Error cleaning up orphaned product assignments:', cleanupErr);
        }
        
        // Then fetch products
        db.all(
          `SELECT p.* FROM products p 
           INNER JOIN user_products up ON p.id = up.product_id 
           WHERE up.user_id = ? 
           ORDER BY p.created_at DESC`,
          [userId],
          (err, products) => {
            if (err) {
              return res.status(500).json({ error: 'Error fetching products' });
            }
            res.json({ products: products || [] });
          }
        );
      }
    );
  }
});

app.post('/api/products', authenticateToken, requireSuperAdmin, (req, res) => {
  const { name, description, price, stock, image_url, domain } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Product title is required' });
  }

  if (!domain || !domain.trim()) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  const trimmedName = name.trim();
  const trimmedDomain = domain.trim();

  // Check for duplicate product names
  db.get('SELECT id FROM products WHERE LOWER(name) = LOWER(?)', [trimmedName], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking for duplicate product' });
    }
    if (existing) {
      return res.status(400).json({ error: 'A product with this name already exists' });
    }

    // Check for duplicate domains
    db.get('SELECT id FROM products WHERE LOWER(domain) = LOWER(?)', [trimmedDomain], (err, existingDomain) => {
      if (err) {
        return res.status(500).json({ error: 'Error checking for duplicate domain' });
      }
      if (existingDomain) {
        return res.status(400).json({ error: 'A product with this domain already exists' });
      }

      db.run(
        'INSERT INTO products (name, description, price, stock, image_url, domain) VALUES (?, ?, ?, ?, ?, ?)',
        [trimmedName, description || '', price || 0, stock || 0, image_url || '', trimmedDomain],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error creating product' });
          }
          const productId = this.lastID;
          res.status(201).json({ message: 'Product created', id: productId });
        }
      );
    });
  });
});

app.put('/api/products/:id', authenticateToken, requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock, image_url } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Product title is required' });
  }

  const trimmedName = name.trim();

  // Check if product exists
  db.get('SELECT id FROM products WHERE id = ?', [id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking product' });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // If regular admin, validate they have access to this product
    if (req.user.role !== 'super_admin') {
      db.get('SELECT product_id FROM user_products WHERE user_id = ? AND product_id = ?', [req.user.id, id], (err, access) => {
        if (err) {
          return res.status(500).json({ error: 'Error checking product access' });
        }
        if (!access) {
          return res.status(403).json({ error: 'You do not have access to this product' });
        }
        updateProduct();
      });
    } else {
      updateProduct();
    }

    function updateProduct() {
      const { domain } = req.body;
      
      if (!domain || !domain.trim()) {
        return res.status(400).json({ error: 'Domain is required' });
      }

      const trimmedDomain = domain.trim();

      // Check for duplicate product names (excluding current product)
      db.get('SELECT id FROM products WHERE LOWER(name) = LOWER(?) AND id != ?', [trimmedName, id], (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Error checking for duplicate product' });
        }
        if (existing) {
          return res.status(400).json({ error: 'A product with this name already exists' });
        }

        // Check for duplicate domains (excluding current product)
        db.get('SELECT id FROM products WHERE LOWER(domain) = LOWER(?) AND id != ?', [trimmedDomain, id], (err, existingDomain) => {
          if (err) {
            return res.status(500).json({ error: 'Error checking for duplicate domain' });
          }
          if (existingDomain) {
            return res.status(400).json({ error: 'A product with this domain already exists' });
          }

          db.run(
            'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, image_url = ?, domain = ? WHERE id = ?',
            [trimmedName, description || '', price || 0, stock || 0, image_url || '', trimmedDomain, id],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Error updating product' });
              }
              if (this.changes === 0) {
                return res.status(404).json({ error: 'Product not found' });
              }
              res.json({ message: 'Product updated successfully' });
            }
          );
        });
      });
    }
  });
});

app.delete('/api/products/:id', authenticateToken, requireSuperAdmin, (req, res) => {
  const { id } = req.params;

  // Check if product exists
  db.get('SELECT id FROM products WHERE id = ?', [id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking product' });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    deleteProduct();
  });

  function deleteProduct() {
    // First delete all user_products assignments for this product
    db.run('DELETE FROM user_products WHERE product_id = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error removing product assignments' });
      }
      
      // Then delete the product
      db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error deleting product' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
      });
    });
  }
});

// Debug endpoint to list all products with domains (for troubleshooting)
app.get('/api/products/debug-domains', (req, res) => {
  db.all('SELECT id, name, domain FROM products', (err, products) => {
    if (err) {
      if (err.message && err.message.includes('no such column: domain')) {
        return res.status(500).json({ 
          error: 'Domain column does not exist. Please run: npm run migrate',
          products: products || []
        });
      }
      return res.status(500).json({ error: 'Error fetching products: ' + err.message });
    }
    res.json({ 
      products: products || [],
      message: 'List of all products with their domains'
    });
  });
});

// Public endpoint to get product ID by domain
app.get('/api/products/by-domain', (req, res) => {
  const { domain } = req.query;

  if (!domain || !domain.trim()) {
    return res.status(400).json({ error: 'Domain parameter is required' });
  }

  const trimmedDomain = domain.trim();
  console.log('Searching for domain:', trimmedDomain);

  // Query for product with matching domain
  db.get('SELECT id FROM products WHERE LOWER(TRIM(domain)) = LOWER(?)', [trimmedDomain], (err, product) => {
    if (err) {
      console.error('Database error:', err);
      // Check if domain column exists
      if (err.message && err.message.includes('no such column: domain')) {
        return res.status(500).json({ 
          error: 'Domain column does not exist. Please run database migrations: npm run migrate' 
        });
      }
      return res.status(500).json({ error: 'Error fetching product: ' + err.message });
    }
    if (!product) {
      // Debug: Get all products to help troubleshoot
      db.all('SELECT id, name, domain FROM products', (err, allProducts) => {
        if (!err && allProducts) {
          console.log('All products in database:');
          allProducts.forEach(p => {
            console.log(`  ID: ${p.id}, Name: "${p.name}", Domain: "${p.domain || '(NULL or empty)'}"`);
          });
          console.log(`Searching for: "${trimmedDomain}"`);
          
          // Check for close matches
          const closeMatches = allProducts.filter(p => {
            if (!p.domain) return false;
            const storedDomain = p.domain.trim().toLowerCase();
            const searchDomain = trimmedDomain.toLowerCase();
            return storedDomain.includes(searchDomain) || searchDomain.includes(storedDomain);
          });
          
          if (closeMatches.length > 0) {
            console.log('Close matches found:', closeMatches.map(p => `ID: ${p.id}, Domain: "${p.domain}"`));
          }
        }
      });
      return res.status(404).json({ 
        error: `Product not found for domain "${trimmedDomain}". Check that the product has the domain field set correctly.`,
        hint: 'Visit /api/products/debug-domains to see all products and their domains'
      });
    }
    console.log('Product found:', product.id);
    res.json({ productId: product.id });
  });
});

// Root route - helpful message in development
if (process.env.NODE_ENV !== 'production') {
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Backend API is running',
      api: 'Access API at /api',
      note: 'Frontend should be running on port 3000'
    });
  });
}

// Serve React app in production (catch-all handler)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`API available at http://localhost:${PORT}/api`);
  }
});

