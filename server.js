const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const path = require('path');

app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
// Note: req.body is not available in destination function, so we'll handle productId in the route handler
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Store in temp location first, we'll move it in the route handler
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Serve uploaded files (including product-specific folders)
// Use express.static with options to serve nested directories
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    // Set proper content type for images
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }
  }
}));

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

// Helper function to assign categories from a template to a product
// Since categories are now product-specific, we need to create new categories for this product
function assignCategoriesFromTemplate(productId, templateId, callback) {
  if (!templateId) {
    return callback(null); // No template selected
  }

  // Get template categories with their names (we need names to create new product-specific categories)
  db.all(`
    SELECT 
      tc.category_id,
      tc.sub_category_id,
      tc.display_order,
      c.name as category_name,
      sc.name as sub_category_name
    FROM template_categories tc
    INNER JOIN categories c ON tc.category_id = c.id
    LEFT JOIN sub_categories sc ON tc.sub_category_id = sc.id
    WHERE tc.template_id = ?
    ORDER BY tc.display_order ASC, tc.category_id ASC
  `, [templateId], (err, templateCategories) => {
    if (err) {
      return callback(err);
    }

    if (templateCategories.length === 0) {
      return callback(null); // Template has no categories
    }

    // Group by category to create product-specific categories
    const categoryMap = {};
    templateCategories.forEach(tc => {
      if (!categoryMap[tc.category_id]) {
        categoryMap[tc.category_id] = {
          categoryName: tc.category_name,
          displayOrder: tc.display_order,
          subCategories: []
        };
      }
      if (tc.sub_category_id && tc.sub_category_name) {
        categoryMap[tc.category_id].subCategories.push({
          name: tc.sub_category_name,
          displayOrder: tc.display_order
        });
      }
    });

    // Create product-specific categories and sub-categories
    const categoryIds = {};
    let categoryIndex = 0;
    const categoryKeys = Object.keys(categoryMap);
    const totalCategories = categoryKeys.length;

    if (totalCategories === 0) {
      return callback(null);
    }

    function createNextCategory() {
      if (categoryIndex >= totalCategories) {
        // All categories created, now assign them to product
        assignProductCategories();
        return;
      }

      const originalCategoryId = categoryKeys[categoryIndex];
      const categoryData = categoryMap[originalCategoryId];
      
      // Create product-specific category
      db.run('INSERT INTO categories (name, product_id, display_order) VALUES (?, ?, ?)',
        [categoryData.categoryName, productId, categoryData.displayOrder],
        function(err) {
          if (err) {
            return callback(err);
          }
          
          const newCategoryId = this.lastID;
          categoryIds[originalCategoryId] = {
            newId: newCategoryId,
            subCategories: {}
          };

          // Create sub-categories for this category
          if (categoryData.subCategories.length === 0) {
            categoryIndex++;
            createNextCategory();
          } else {
            let subIndex = 0;
            function createNextSubCategory() {
              if (subIndex >= categoryData.subCategories.length) {
                categoryIndex++;
                createNextCategory();
                return;
              }

              const subCat = categoryData.subCategories[subIndex];
              db.run('INSERT INTO sub_categories (category_id, product_id, name, display_order) VALUES (?, ?, ?, ?)',
                [newCategoryId, productId, subCat.name, subCat.displayOrder],
                function(err) {
                  if (err) {
                    return callback(err);
                  }
                  categoryIds[originalCategoryId].subCategories[subCat.name] = this.lastID;
                  subIndex++;
                  createNextSubCategory();
                }
              );
            }
            createNextSubCategory();
          }
        }
      );
    }

    function assignProductCategories() {
      // Now assign categories to product via product_categories table
      const stmt = db.prepare('INSERT INTO product_categories (product_id, category_id, sub_category_id) VALUES (?, ?, ?)');
      let completed = 0;
      let hasError = false;
      let total = 0;

      // Calculate total assignments - count unique category+subcategory pairs from template
      const assignmentMap = new Map();
      templateCategories.forEach(tc => {
        if (categoryIds[tc.category_id]) {
          const key = `${tc.category_id}_${tc.sub_category_id || 'null'}`;
          if (!assignmentMap.has(key)) {
            assignmentMap.set(key, {
              categoryId: tc.category_id,
              subCategoryId: tc.sub_category_id,
              subCategoryName: tc.sub_category_name
            });
            total++;
          }
        }
      });

      if (total === 0) {
        stmt.finalize();
        return callback(null);
      }

      // Assign each unique category+subcategory pair
      assignmentMap.forEach((assignment) => {
        const newCategoryId = categoryIds[assignment.categoryId].newId;
        
        if (assignment.subCategoryId && assignment.subCategoryName) {
          // Find the new sub-category ID by name
          const newSubCategoryId = categoryIds[assignment.categoryId].subCategories[assignment.subCategoryName];
          
          if (newSubCategoryId) {
            stmt.run([productId, newCategoryId, newSubCategoryId], (err) => {
              if (err && !hasError) {
                hasError = true;
                stmt.finalize();
                return callback(err);
              }
              completed++;
              if (completed === total && !hasError) {
                stmt.finalize();
                callback(null);
              }
            });
          } else {
            completed++;
            if (completed === total && !hasError) {
              stmt.finalize();
              callback(null);
            }
          }
        } else {
          // Category without sub-category
          stmt.run([productId, newCategoryId, null], (err) => {
            if (err && !hasError) {
              hasError = true;
              stmt.finalize();
              return callback(err);
            }
            completed++;
            if (completed === total && !hasError) {
              stmt.finalize();
              callback(null);
            }
          });
        }
      });
    }

    createNextCategory();
  });
}

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
          
          // Assign categories from template if provided
          const { templateId } = req.body;
          if (templateId) {
            assignCategoriesFromTemplate(productId, templateId, (assignErr) => {
              if (assignErr) {
                console.error('Error assigning categories from template:', assignErr);
                // Still return success, but log the error
              }
              res.status(201).json({ message: 'Product created', id: productId });
            });
          } else {
            res.status(201).json({ message: 'Product created', id: productId });
          }
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

// Categories API - Get all categories for a specific product
app.get('/api/categories', authenticateToken, (req, res) => {
  const { productId } = req.query;

  if (!productId) {
    return res.status(400).json({ error: 'productId query parameter is required' });
  }

  const productIdNum = parseInt(productId);
  if (isNaN(productIdNum)) {
    return res.status(400).json({ error: 'Invalid productId' });
  }

  db.all(`
    SELECT 
      c.id,
      c.name,
      c.display_order,
      GROUP_CONCAT(sc.id || ':' || sc.name || ':' || sc.display_order || ':' || COALESCE(sc.image_url, ''), '||') as sub_categories
    FROM categories c
    LEFT JOIN sub_categories sc ON c.id = sc.category_id AND sc.product_id = ?
    WHERE c.product_id = ?
    GROUP BY c.id
    ORDER BY c.display_order ASC
  `, [productIdNum, productIdNum], (err, rows) => {
    if (err) {
      // If product_id column doesn't exist yet (migration not run), handle gracefully
      if (err.message && err.message.includes('no such column: product_id')) {
        // Fallback: return empty array until migration is run
        return res.json({ categories: [] });
      }
      return res.status(500).json({ error: 'Error fetching categories: ' + err.message });
    }

    const categories = rows.map(row => {
      const subCategories = row.sub_categories
        ? row.sub_categories.split('||').map(sub => {
            const parts = sub.split(':');
            const id = parts[0];
            const name = parts[1];
            const order = parts[2];
            const image_url = parts[3] || null;
            return { 
              id: parseInt(id), 
              name, 
              display_order: parseInt(order) || 0,
              image_url: image_url || null
            };
          }).sort((a, b) => a.display_order - b.display_order)
        : [];

      return {
        id: row.id,
        name: row.name,
        display_order: row.display_order || 0,
        subCategories
      };
    });

    res.json({ categories });
  });
});

// Categories API - Create category
app.post('/api/categories', authenticateToken, requireAdmin, (req, res) => {
  const { name, productId } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  const trimmedName = name.trim();
  const productIdNum = parseInt(productId);
  
  if (isNaN(productIdNum)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  // Verify product exists and user has access
  db.get('SELECT id FROM products WHERE id = ?', [productIdNum], (err, product) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking product' });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check for duplicate within this product
    db.get('SELECT id FROM categories WHERE product_id = ? AND LOWER(name) = LOWER(?)', [productIdNum, trimmedName], (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Error checking for duplicate category' });
      }
      if (existing) {
        return res.status(400).json({ error: 'A category with this name already exists for this product' });
      }

      // Get max display_order for this product and add 1
      db.get('SELECT MAX(display_order) as max_order FROM categories WHERE product_id = ?', [productIdNum], (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Error getting max order' });
        }
        const displayOrder = (result?.max_order || 0) + 1;

        db.run('INSERT INTO categories (name, product_id, display_order) VALUES (?, ?, ?)', [trimmedName, productIdNum, displayOrder], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error creating category' });
          }
          res.status(201).json({ message: 'Category created', id: this.lastID });
        });
      });
    });
  });
});

// Categories API - Reorder categories (MUST come before /:id route to avoid route conflict)
app.put('/api/categories/reorder', authenticateToken, requireAdmin, (req, res) => {
  const { categories, productId } = req.body;

  if (!Array.isArray(categories)) {
    return res.status(400).json({ error: 'Categories must be an array' });
  }

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  const productIdNum = parseInt(productId);
  if (isNaN(productIdNum)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  if (categories.length === 0) {
    return res.json({ message: 'Category order updated successfully' });
  }

  // First, verify all categories belong to this product
  const categoryIds = categories.map(cat => cat.id);
  const placeholders = categoryIds.map(() => '?').join(',');
  
  db.all(`SELECT id, product_id FROM categories WHERE id IN (${placeholders})`, categoryIds, (err, existingCats) => {
    if (err) {
      return res.status(500).json({ error: 'Error verifying categories: ' + err.message });
    }

    // Check if all categories exist and belong to this product
    const invalidCats = existingCats.filter(cat => cat.product_id !== productIdNum);
    if (invalidCats.length > 0) {
      return res.status(403).json({ 
        error: `Some categories do not belong to this product. Invalid IDs: ${invalidCats.map(c => c.id).join(', ')}` 
      });
    }

    if (existingCats.length !== categories.length) {
      return res.status(404).json({ error: 'Some categories were not found' });
    }

    // Update display_order for all categories, filtering by product_id
    const stmt = db.prepare('UPDATE categories SET display_order = ? WHERE id = ? AND product_id = ?');
    let completed = 0;
    let hasError = false;

    categories.forEach((cat) => {
      if (!cat.id || cat.display_order === undefined) {
        if (!hasError) {
          hasError = true;
          stmt.finalize();
          return res.status(400).json({ error: 'Invalid category data: id and display_order are required' });
        }
        return;
      }

      stmt.run([cat.display_order, cat.id, productIdNum], (err) => {
        if (err && !hasError) {
          hasError = true;
          stmt.finalize();
          return res.status(500).json({ error: 'Error updating category order' });
        }
        completed++;
        if (completed === categories.length && !hasError) {
          stmt.finalize();
          res.json({ message: 'Category order updated successfully' });
        }
      });
    });
  });
});

// Categories API - Update category
app.put('/api/categories/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const trimmedName = name.trim();

  // Check if category exists and get its product_id
  db.get('SELECT id, product_id FROM categories WHERE id = ?', [id], (err, category) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking category' });
    }
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check for duplicate within the same product (excluding current)
    db.get('SELECT id FROM categories WHERE product_id = ? AND LOWER(name) = LOWER(?) AND id != ?', 
      [category.product_id, trimmedName, id], 
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Error checking for duplicate category' });
        }
        if (existing) {
          return res.status(400).json({ error: 'A category with this name already exists for this product' });
        }

        db.run('UPDATE categories SET name = ? WHERE id = ?', [trimmedName, id], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error updating category' });
          }
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Category not found' });
          }
          res.json({ message: 'Category updated successfully' });
        });
      }
    );
  });
});

// Categories API - Delete category
app.delete('/api/categories/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { productId } = req.query; // Get productId from query to validate ownership

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  const productIdNum = parseInt(productId);
  if (isNaN(productIdNum)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  // Check if category exists and belongs to this product
  db.get('SELECT id, product_id FROM categories WHERE id = ?', [id], (err, category) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking category' });
    }
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (category.product_id !== productIdNum) {
      return res.status(403).json({ error: 'Category does not belong to this product' });
    }

    db.run('DELETE FROM categories WHERE id = ? AND product_id = ?', [id, productIdNum], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error deleting category' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      res.json({ message: 'Category deleted successfully' });
    });
  });
});

// Sub-Categories API - Create sub-category
app.post('/api/sub-categories', authenticateToken, requireAdmin, (req, res) => {
  const { categoryId, name, image_url, productId } = req.body;

  if (!categoryId || !name || !name.trim()) {
    return res.status(400).json({ error: 'Category ID and sub-category name are required' });
  }

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  const trimmedName = name.trim();
  const productIdNum = parseInt(productId);
  
  if (isNaN(productIdNum)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  // Check if category exists and belongs to this product
  db.get('SELECT id, product_id FROM categories WHERE id = ?', [categoryId], (err, category) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking category' });
    }
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (category.product_id !== productIdNum) {
      return res.status(403).json({ error: 'Category does not belong to this product' });
    }

    // Check for duplicate within this category
    db.get('SELECT id FROM sub_categories WHERE category_id = ? AND product_id = ? AND LOWER(name) = LOWER(?)', 
      [categoryId, productIdNum, trimmedName], 
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Error checking for duplicate sub-category' });
        }
        if (existing) {
          return res.status(400).json({ error: 'A sub-category with this name already exists in this category' });
        }

        // Get max display_order for this category and add 1
        db.get('SELECT MAX(display_order) as max_order FROM sub_categories WHERE category_id = ? AND product_id = ?', 
          [categoryId, productIdNum], 
          (err, result) => {
            if (err) {
              return res.status(500).json({ error: 'Error getting max order' });
            }
            const displayOrder = (result?.max_order || 0) + 1;

            db.run('INSERT INTO sub_categories (category_id, product_id, name, image_url, display_order) VALUES (?, ?, ?, ?, ?)', 
              [categoryId, productIdNum, trimmedName, image_url || null, displayOrder], 
              function(err) {
                if (err) {
                  return res.status(500).json({ error: 'Error creating sub-category' });
                }
                res.status(201).json({ message: 'Sub-category created', id: this.lastID });
              }
            );
          }
        );
      }
    );
  });
});

// Sub-Categories API - Reorder sub-categories (MUST come before /:id route to avoid route conflict)
app.put('/api/sub-categories/reorder', authenticateToken, requireAdmin, (req, res) => {
  const { subCategories, productId } = req.body;

  if (!Array.isArray(subCategories)) {
    return res.status(400).json({ error: 'Sub-categories must be an array' });
  }

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  const productIdNum = parseInt(productId);
  if (isNaN(productIdNum)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  if (subCategories.length === 0) {
    return res.json({ message: 'Sub-category order updated successfully' });
  }

  // First, verify all sub-categories belong to this product
  const subCategoryIds = subCategories.map(sub => sub.id);
  const placeholders = subCategoryIds.map(() => '?').join(',');
  
  db.all(`SELECT id, product_id FROM sub_categories WHERE id IN (${placeholders})`, subCategoryIds, (err, existingSubs) => {
    if (err) {
      return res.status(500).json({ error: 'Error verifying sub-categories: ' + err.message });
    }

    // Check if all sub-categories exist and belong to this product
    const invalidSubs = existingSubs.filter(sub => sub.product_id !== productIdNum);
    if (invalidSubs.length > 0) {
      return res.status(403).json({ 
        error: `Some sub-categories do not belong to this product. Invalid IDs: ${invalidSubs.map(s => s.id).join(', ')}` 
      });
    }

    if (existingSubs.length !== subCategories.length) {
      return res.status(404).json({ error: 'Some sub-categories were not found' });
    }

    // Update display_order for all sub-categories, filtering by product_id
    const stmt = db.prepare('UPDATE sub_categories SET display_order = ? WHERE id = ? AND product_id = ?');
    let completed = 0;
    let hasError = false;

    subCategories.forEach((sub) => {
      if (!sub.id || sub.display_order === undefined) {
        if (!hasError) {
          hasError = true;
          stmt.finalize();
          return res.status(400).json({ error: 'Invalid sub-category data: id and display_order are required' });
        }
        return;
      }

      stmt.run([sub.display_order, sub.id, productIdNum], (err) => {
        if (err && !hasError) {
          hasError = true;
          stmt.finalize();
          return res.status(500).json({ error: 'Error updating sub-category order' });
        }
        completed++;
        if (completed === subCategories.length && !hasError) {
          stmt.finalize();
          res.json({ message: 'Sub-category order updated successfully' });
        }
      });
    });
  });
});

// Sub-Categories API - Update sub-category
app.put('/api/sub-categories/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, image_url } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Sub-category name is required' });
  }

  const trimmedName = name.trim();

  // Get sub-category to find category_id and product_id
  db.get('SELECT category_id, product_id FROM sub_categories WHERE id = ?', [id], (err, subCategory) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking sub-category' });
    }
    if (!subCategory) {
      return res.status(404).json({ error: 'Sub-category not found' });
    }

    // Check for duplicate within the same category and product (excluding current)
    db.get('SELECT id FROM sub_categories WHERE category_id = ? AND product_id = ? AND LOWER(name) = LOWER(?) AND id != ?', 
      [subCategory.category_id, subCategory.product_id, trimmedName, id], 
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Error checking for duplicate sub-category' });
        }
        if (existing) {
          return res.status(400).json({ error: 'A sub-category with this name already exists in this category' });
        }

        db.run('UPDATE sub_categories SET name = ?, image_url = ? WHERE id = ?', [trimmedName, image_url || null, id], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error updating sub-category' });
          }
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Sub-category not found' });
          }
          res.json({ message: 'Sub-category updated successfully' });
        });
      }
    );
  });
});

// Sub-Categories API - Delete sub-category
app.delete('/api/sub-categories/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { productId } = req.query; // Get productId from query to validate ownership

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  const productIdNum = parseInt(productId);
  if (isNaN(productIdNum)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  // Check if sub-category exists and belongs to this product
  db.get('SELECT id, product_id FROM sub_categories WHERE id = ?', [id], (err, subCategory) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking sub-category' });
    }
    if (!subCategory) {
      return res.status(404).json({ error: 'Sub-category not found' });
    }
    if (subCategory.product_id !== productIdNum) {
      return res.status(403).json({ error: 'Sub-category does not belong to this product' });
    }

    db.run('DELETE FROM sub_categories WHERE id = ? AND product_id = ?', [id, productIdNum], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error deleting sub-category' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Sub-category not found' });
      }
      res.json({ message: 'Sub-category deleted successfully' });
    });
  });
});

// Promo Codes API - Get all promo codes for a product
app.get('/api/products/:id/promo-codes', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.all(`
    SELECT 
      id,
      product_id,
      name,
      discount_percentage,
      is_active,
      created_at,
      updated_at
    FROM promo_codes
    WHERE product_id = ?
    ORDER BY created_at DESC
  `, [id], (err, promoCodes) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching promo codes' });
    }
    res.json({ promoCodes: promoCodes || [] });
  });
});

// Promo Codes API - Create promo code
app.post('/api/products/:id/promo-codes', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, discount_percentage, is_active } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Promo code name is required' });
  }

  if (discount_percentage === undefined || discount_percentage === null) {
    return res.status(400).json({ error: 'Discount percentage is required' });
  }

  const discount = parseFloat(discount_percentage);
  if (isNaN(discount) || discount < 0 || discount > 100) {
    return res.status(400).json({ error: 'Discount percentage must be between 0 and 100' });
  }

  const trimmedName = name.trim();
  const productId = parseInt(id);
  const active = is_active !== undefined ? (is_active ? 1 : 0) : 1;

  // Check if product exists
  db.get('SELECT id FROM products WHERE id = ?', [productId], (err, product) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking product' });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check for duplicate name within this product
    db.get('SELECT id FROM promo_codes WHERE product_id = ? AND LOWER(name) = LOWER(?)', 
      [productId, trimmedName], 
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Error checking for duplicate promo code' });
        }
        if (existing) {
          return res.status(400).json({ error: 'A promo code with this name already exists for this product' });
        }

        db.run('INSERT INTO promo_codes (product_id, name, discount_percentage, is_active) VALUES (?, ?, ?, ?)',
          [productId, trimmedName, discount, active],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Error creating promo code' });
            }
            res.status(201).json({ message: 'Promo code created', id: this.lastID });
          }
        );
      }
    );
  });
});

// Promo Codes API - Update promo code
app.put('/api/promo-codes/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, discount_percentage, is_active } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Promo code name is required' });
  }

  if (discount_percentage === undefined || discount_percentage === null) {
    return res.status(400).json({ error: 'Discount percentage is required' });
  }

  const discount = parseFloat(discount_percentage);
  if (isNaN(discount) || discount < 0 || discount > 100) {
    return res.status(400).json({ error: 'Discount percentage must be between 0 and 100' });
  }

  const trimmedName = name.trim();
  const active = is_active !== undefined ? (is_active ? 1 : 0) : 1;

  // Check if promo code exists and get product_id
  db.get('SELECT id, product_id FROM promo_codes WHERE id = ?', [id], (err, promoCode) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking promo code' });
    }
    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    // Check for duplicate name within the same product (excluding current)
    db.get('SELECT id FROM promo_codes WHERE product_id = ? AND LOWER(name) = LOWER(?) AND id != ?',
      [promoCode.product_id, trimmedName, id],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Error checking for duplicate promo code' });
        }
        if (existing) {
          return res.status(400).json({ error: 'A promo code with this name already exists for this product' });
        }

        db.run('UPDATE promo_codes SET name = ?, discount_percentage = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [trimmedName, discount, active, id],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Error updating promo code' });
            }
            if (this.changes === 0) {
              return res.status(404).json({ error: 'Promo code not found' });
            }
            res.json({ message: 'Promo code updated successfully' });
          }
        );
      }
    );
  });
});

// Promo Codes API - Delete promo code
app.delete('/api/promo-codes/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM promo_codes WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error deleting promo code' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Promo code not found' });
    }
    res.json({ message: 'Promo code deleted successfully' });
  });
});

// Promo Codes API - Toggle promo code active state
app.put('/api/promo-codes/:id/toggle', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.get('SELECT is_active FROM promo_codes WHERE id = ?', [id], (err, promoCode) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking promo code' });
    }
    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found' });
    }

    const newActiveState = promoCode.is_active === 1 ? 0 : 1;

    db.run('UPDATE promo_codes SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newActiveState, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error toggling promo code' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Promo code not found' });
        }
        res.json({ message: 'Promo code toggled successfully', is_active: newActiveState === 1 });
      }
    );
  });
});

// Product Items API - Get all product items for a product
app.get('/api/products/:id/product-items', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.all(`
    SELECT 
      pi.id,
      pi.product_id,
      pi.name,
      pi.description,
      pi.weight,
      pi.price,
      pi.brand_id,
      pi.image_url,
      pi.display_order,
      pi.is_active,
      pi.created_at,
      pi.updated_at,
      b.name as brand_name
    FROM product_items pi
    LEFT JOIN brands b ON pi.brand_id = b.id
    WHERE pi.product_id = ?
    ORDER BY pi.display_order ASC, pi.created_at ASC
  `, [id], (err, productItems) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching product items' });
    }

    // Fetch personalities and sub-categories for each product item
    if (productItems && productItems.length > 0) {
      const itemIds = productItems.map(item => item.id);
      const placeholders = itemIds.map(() => '?').join(',');
      
      // Fetch personalities
      db.all(`
        SELECT 
          ip.product_item_id,
          p.id as personality_id,
          p.name as personality_name,
          p.image_url as personality_image_url
        FROM item_personalities ip
        INNER JOIN personalities p ON ip.personality_id = p.id
        WHERE ip.product_item_id IN (${placeholders})
      `, itemIds, (err, itemPersonalities) => {
        if (err) {
          console.error('Error fetching item personalities:', err);
        }

        // Group personalities by product_item_id
        const personalitiesByItem = {};
        if (itemPersonalities) {
          itemPersonalities.forEach(ip => {
            if (!personalitiesByItem[ip.product_item_id]) {
              personalitiesByItem[ip.product_item_id] = [];
            }
            personalitiesByItem[ip.product_item_id].push({
              id: ip.personality_id,
              name: ip.personality_name,
              image_url: ip.personality_image_url
            });
          });
        }

        // Fetch sub-categories
        db.all(`
          SELECT 
            isc.product_item_id,
            sc.id as sub_category_id,
            sc.name as sub_category_name,
            sc.image_url as sub_category_image_url,
            c.id as category_id,
            c.name as category_name
          FROM item_sub_categories isc
          INNER JOIN sub_categories sc ON isc.sub_category_id = sc.id
          INNER JOIN categories c ON sc.category_id = c.id
          WHERE isc.product_item_id IN (${placeholders})
        `, itemIds, (err, itemSubCategories) => {
          if (err) {
            console.error('Error fetching item sub-categories:', err);
            // Continue without sub-categories if table doesn't exist
            const itemsWithData = productItems.map(item => ({
              ...item,
              personalities: personalitiesByItem[item.id] || [],
              subCategories: []
            }));
            return res.json({ productItems: itemsWithData });
          }

          // Group sub-categories by product_item_id
          const subCategoriesByItem = {};
          if (itemSubCategories) {
            itemSubCategories.forEach(isc => {
              if (!subCategoriesByItem[isc.product_item_id]) {
                subCategoriesByItem[isc.product_item_id] = [];
              }
              subCategoriesByItem[isc.product_item_id].push({
                id: isc.sub_category_id,
                name: isc.sub_category_name,
                image_url: isc.sub_category_image_url,
                category_id: isc.category_id,
                category_name: isc.category_name
              });
            });
          }

          // Add personalities and sub-categories to each product item
          const itemsWithData = productItems.map(item => ({
            ...item,
            personalities: personalitiesByItem[item.id] || [],
            subCategories: subCategoriesByItem[item.id] || []
          }));

          res.json({ productItems: itemsWithData });
        });
      });
    } else {
      res.json({ productItems: [] });
    }
  });
});

// Product Items API - Create product item
app.post('/api/products/:id/product-items', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, description, weight, price, brand_id, personality_id, image_url, is_active, sub_category_ids } = req.body;

  if (!weight || !weight.trim()) {
    return res.status(400).json({ error: 'Weight is required' });
  }

  if (price === undefined || price === null) {
    return res.status(400).json({ error: 'Price is required' });
  }

  const trimmedWeight = weight.trim();
  const priceNum = parseFloat(price);
  
  if (isNaN(priceNum) || priceNum < 0) {
    return res.status(400).json({ error: 'Invalid price' });
  }

  // Validate brand_id if provided
  if (brand_id) {
    const brandIdNum = parseInt(brand_id);
    if (isNaN(brandIdNum)) {
      return res.status(400).json({ error: 'Invalid brand ID' });
    }
    // Verify brand exists and belongs to this product
    db.get('SELECT id FROM brands WHERE id = ? AND product_id = ?', [brandIdNum, id], (err, brand) => {
      if (err) {
        return res.status(500).json({ error: 'Error checking brand' });
      }
      if (!brand) {
        return res.status(400).json({ error: 'Brand not found or does not belong to this product' });
      }
      // Continue with creation
      createProductItem();
    });
  } else {
    createProductItem();
  }

  function createProductItem(personalityId) {
    // Check for duplicate weight within this product
    db.get('SELECT id FROM product_items WHERE product_id = ? AND weight = ?', [id, trimmedWeight], (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Error checking for duplicate product item' });
      }
      if (existing) {
        return res.status(400).json({ error: 'A product item with this weight already exists for this product' });
      }

      // Get max display_order for this product
      db.get('SELECT MAX(display_order) as max_order FROM product_items WHERE product_id = ?', [id], (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Error getting max order' });
        }
        const displayOrder = (result?.max_order || 0) + 1;
        const active = is_active !== undefined ? (is_active ? 1 : 0) : 1;
        const brandId = brand_id ? parseInt(brand_id) : null;

        db.run(
          'INSERT INTO product_items (product_id, name, description, weight, price, brand_id, personality_id, image_url, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, name?.trim() || null, description?.trim() || null, trimmedWeight, priceNum, brandId, personalityId, image_url || null, displayOrder, active],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Error creating product item' });
            }
            
            const productItemId = this.lastID;
            
            // Save sub-categories if provided
            if (sub_category_ids && Array.isArray(sub_category_ids) && sub_category_ids.length > 0) {
              // Validate that all sub-categories belong to this product
              const subCategoryPlaceholders = sub_category_ids.map(() => '?').join(',');
              db.all(`
                SELECT sc.id 
                FROM sub_categories sc
                WHERE sc.id IN (${subCategoryPlaceholders}) AND sc.product_id = ?
              `, [...sub_category_ids, id], (err, validSubCategories) => {
                if (err) {
                  console.error('Error validating sub-categories:', err);
                  // Continue without sub-categories if validation fails
                  return res.status(201).json({ message: 'Product item created', id: productItemId });
                }
                
                if (validSubCategories.length !== sub_category_ids.length) {
                  return res.status(400).json({ error: 'Some sub-categories do not belong to this product' });
                }
                
                // Insert sub-category associations
                const insertStmt = db.prepare('INSERT INTO item_sub_categories (product_item_id, sub_category_id) VALUES (?, ?)');
                let completed = 0;
                let hasError = false;
                
                sub_category_ids.forEach(subCategoryId => {
                  insertStmt.run([productItemId, subCategoryId], (err) => {
                    if (err && !hasError) {
                      hasError = true;
                      insertStmt.finalize();
                      return res.status(500).json({ error: 'Error saving sub-categories' });
                    }
                    completed++;
                    if (completed === sub_category_ids.length && !hasError) {
                      insertStmt.finalize();
                      res.status(201).json({ message: 'Product item created', id: productItemId });
                    }
                  });
                });
                
                if (sub_category_ids.length === 0) {
                  res.status(201).json({ message: 'Product item created', id: productItemId });
                }
              });
            } else {
              res.status(201).json({ message: 'Product item created', id: productItemId });
            }
          }
        );
      });
    });
  }
});

// Product Items API - Update product item
app.put('/api/product-items/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, description, weight, price, brand_id, personality_ids, image_url, is_active, sub_category_ids } = req.body;

  if (!weight || !weight.trim()) {
    return res.status(400).json({ error: 'Weight is required' });
  }

  if (price === undefined || price === null) {
    return res.status(400).json({ error: 'Price is required' });
  }

  const trimmedWeight = weight.trim();
  const priceNum = parseFloat(price);
  
  if (isNaN(priceNum) || priceNum < 0) {
    return res.status(400).json({ error: 'Invalid price' });
  }

  // Check if product item exists and get its product_id
  db.get('SELECT id, product_id FROM product_items WHERE id = ?', [id], (err, productItem) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking product item' });
    }
    if (!productItem) {
      return res.status(404).json({ error: 'Product item not found' });
    }

    // Check for duplicate weight within the same product (excluding current)
    db.get('SELECT id FROM product_items WHERE product_id = ? AND weight = ? AND id != ?', 
      [productItem.product_id, trimmedWeight, id], 
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Error checking for duplicate product item' });
        }
        if (existing) {
          return res.status(400).json({ error: 'A product item with this weight already exists for this product' });
        }

        const active = is_active !== undefined ? (is_active ? 1 : 0) : productItem.is_active;

        // Validate brand_id if provided
        if (brand_id) {
          const brandIdNum = parseInt(brand_id);
          if (isNaN(brandIdNum)) {
            return res.status(400).json({ error: 'Invalid brand ID' });
          }
          // Verify brand exists and belongs to this product
          db.get('SELECT id FROM brands WHERE id = ? AND product_id = ?', [brandIdNum, productItem.product_id], (err, brand) => {
            if (err) {
              return res.status(500).json({ error: 'Error checking brand' });
            }
            if (!brand) {
              return res.status(400).json({ error: 'Brand not found or does not belong to this product' });
            }
            // Continue with update
            updateProductItem(brandIdNum);
          });
        } else {
          updateProductItem(null);
        }

        function updateProductItem(brandId) {
          db.run(
            'UPDATE product_items SET name = ?, description = ?, weight = ?, price = ?, brand_id = ?, image_url = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name?.trim() || null, description?.trim() || null, trimmedWeight, priceNum, brandId, image_url || null, active, id],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Error updating product item' });
              }
              if (this.changes === 0) {
                return res.status(404).json({ error: 'Product item not found' });
              }
              
              // Update sub-categories
              // First, delete existing associations
              db.run('DELETE FROM item_sub_categories WHERE product_item_id = ?', [id], (err) => {
                if (err) {
                  console.error('Error deleting existing sub-categories:', err);
                  // Continue even if deletion fails
                }
                
                // Then, insert new associations if provided
                if (sub_category_ids && Array.isArray(sub_category_ids) && sub_category_ids.length > 0) {
                  // Validate that all sub-categories belong to this product
                  const subCategoryPlaceholders = sub_category_ids.map(() => '?').join(',');
                  db.all(`
                    SELECT sc.id 
                    FROM sub_categories sc
                    WHERE sc.id IN (${subCategoryPlaceholders}) AND sc.product_id = ?
                  `, [...sub_category_ids, productItem.product_id], (err, validSubCategories) => {
                    if (err) {
                      console.error('Error validating sub-categories:', err);
                      return res.json({ message: 'Product item updated successfully' });
                    }
                    
                    if (validSubCategories.length !== sub_category_ids.length) {
                      return res.status(400).json({ error: 'Some sub-categories do not belong to this product' });
                    }
                    
                    // Insert sub-category associations
                    const insertStmt = db.prepare('INSERT INTO item_sub_categories (product_item_id, sub_category_id) VALUES (?, ?)');
                    let completed = 0;
                    let hasError = false;
                    
                    sub_category_ids.forEach(subCategoryId => {
                      insertStmt.run([id, subCategoryId], (err) => {
                        if (err && !hasError) {
                          hasError = true;
                          insertStmt.finalize();
                          return res.status(500).json({ error: 'Error saving sub-categories' });
                        }
                        completed++;
                        if (completed === sub_category_ids.length && !hasError) {
                          insertStmt.finalize();
                          res.json({ message: 'Product item updated successfully' });
                        }
                      });
                    });
                    
                    if (sub_category_ids.length === 0) {
                      res.json({ message: 'Product item updated successfully' });
                    }
                  });
                } else {
                  res.json({ message: 'Product item updated successfully' });
                }
              });
            }
          );
        }
      }
    );
  });
});

// Product Items API - Delete product item
app.delete('/api/product-items/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM product_items WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error deleting product item' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Product item not found' });
    }
    res.json({ message: 'Product item deleted successfully' });
  });
});

// Product Items API - Reorder product items
app.put('/api/product-items/reorder', authenticateToken, requireAdmin, (req, res) => {
  const { productItems, productId } = req.body;

  if (!Array.isArray(productItems)) {
    return res.status(400).json({ error: 'Product items must be an array' });
  }

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  const productIdNum = parseInt(productId);
  if (isNaN(productIdNum)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  if (productItems.length === 0) {
    return res.json({ message: 'Product item order updated successfully' });
  }

  // First, verify all product items belong to this product
  const itemIds = productItems.map(item => item.id);
  const placeholders = itemIds.map(() => '?').join(',');
  
  db.all(`SELECT id, product_id FROM product_items WHERE id IN (${placeholders})`, itemIds, (err, existingItems) => {
    if (err) {
      return res.status(500).json({ error: 'Error verifying product items: ' + err.message });
    }

    // Check if all product items exist and belong to this product
    const invalidItems = existingItems.filter(item => item.product_id !== productIdNum);
    if (invalidItems.length > 0) {
      return res.status(403).json({ 
        error: `Some product items do not belong to this product. Invalid IDs: ${invalidItems.map(i => i.id).join(', ')}` 
      });
    }

    if (existingItems.length !== productItems.length) {
      return res.status(404).json({ error: 'Some product items were not found' });
    }

    // Update display_order for all product items, filtering by product_id
    const stmt = db.prepare('UPDATE product_items SET display_order = ? WHERE id = ? AND product_id = ?');
    let completed = 0;
    let hasError = false;

    productItems.forEach((item) => {
      if (!item.id || item.display_order === undefined) {
        if (!hasError) {
          hasError = true;
          stmt.finalize();
          return res.status(400).json({ error: 'Invalid product item data: id and display_order are required' });
        }
        return;
      }

      stmt.run([item.display_order, item.id, productIdNum], (err) => {
        if (err && !hasError) {
          hasError = true;
          stmt.finalize();
          return res.status(500).json({ error: 'Error updating product item order' });
        }
        completed++;
        if (completed === productItems.length && !hasError) {
          stmt.finalize();
          res.json({ message: 'Product item order updated successfully' });
        }
      });
    });
  });
});

// Brands API - Get all brands for a product
app.get('/api/products/:id/brands', authenticateToken, (req, res) => {
  const { id } = req.params;

  // First check if table exists
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='brands'", (err, tables) => {
    if (err) {
      console.error('Error checking brands table:', err);
      return res.status(500).json({ error: 'Error checking brands table: ' + err.message });
    }

    // If table doesn't exist, return empty array
    if (!tables || tables.length === 0) {
      console.log('Brands table does not exist yet, returning empty array');
      return res.json({ brands: [] });
    }

    // Table exists, fetch brands
    db.all(`
      SELECT 
        id,
        product_id,
        name,
        created_at,
        updated_at
      FROM brands
      WHERE product_id = ?
      ORDER BY name ASC
    `, [id], (err, brands) => {
      if (err) {
        console.error('Error fetching brands:', err);
        return res.status(500).json({ error: 'Error fetching brands: ' + err.message });
      }
      res.json({ brands: brands || [] });
    });
  });
});

// Brands API - Create brand
app.post('/api/products/:id/brands', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Brand name is required' });
  }

  const trimmedName = name.trim();
  const productIdNum = parseInt(id);
  
  if (isNaN(productIdNum)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  // Verify product exists
  db.get('SELECT id FROM products WHERE id = ?', [productIdNum], (err, product) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking product' });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check for duplicate within this product
    db.get('SELECT id FROM brands WHERE product_id = ? AND LOWER(name) = LOWER(?)', [productIdNum, trimmedName], (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Error checking for duplicate brand' });
      }
      if (existing) {
        return res.status(400).json({ error: 'A brand with this name already exists for this product' });
      }

      db.run('INSERT INTO brands (product_id, name) VALUES (?, ?)', [productIdNum, trimmedName], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error creating brand' });
        }
        res.status(201).json({ message: 'Brand created', id: this.lastID });
      });
    });
  });
});

// Brands API - Update brand
app.put('/api/brands/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Brand name is required' });
  }

  const trimmedName = name.trim();

  // Check if brand exists and get its product_id
  db.get('SELECT id, product_id FROM brands WHERE id = ?', [id], (err, brand) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking brand' });
    }
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    // Check for duplicate within the same product (excluding current)
    db.get('SELECT id FROM brands WHERE product_id = ? AND LOWER(name) = LOWER(?) AND id != ?', 
      [brand.product_id, trimmedName, id], 
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Error checking for duplicate brand' });
        }
        if (existing) {
          return res.status(400).json({ error: 'A brand with this name already exists for this product' });
        }

        db.run('UPDATE brands SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [trimmedName, id], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error updating brand' });
          }
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Brand not found' });
          }
          res.json({ message: 'Brand updated successfully' });
        });
      }
    );
  });
});

// Brands API - Delete brand
app.delete('/api/brands/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { productId } = req.query; // Get productId from query to validate ownership

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  const productIdNum = parseInt(productId);
  if (isNaN(productIdNum)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  // Check if brand exists and belongs to this product
  db.get('SELECT id, product_id FROM brands WHERE id = ?', [id], (err, brand) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking brand' });
    }
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    if (brand.product_id !== productIdNum) {
      return res.status(403).json({ error: 'Brand does not belong to this product' });
    }

    db.run('DELETE FROM brands WHERE id = ? AND product_id = ?', [id, productIdNum], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error deleting brand' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Brand not found' });
      }
      res.json({ message: 'Brand deleted successfully' });
    });
  });
});

// Upload endpoint for images
app.post('/api/upload', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Get productId from form data (now available after multer processes the request)
  const productId = req.body.productId;
  let imageUrl;
  let finalPath = req.file.path;
  
  if (productId) {
    // Create product-specific folder
    const productUploadDir = path.join(uploadsDir, `product_${productId}`);
    if (!fs.existsSync(productUploadDir)) {
      fs.mkdirSync(productUploadDir, { recursive: true });
    }
    
    // Move file to product-specific folder
    const newPath = path.join(productUploadDir, req.file.filename);
    try {
      fs.renameSync(req.file.path, newPath);
      finalPath = newPath;
      imageUrl = `/uploads/product_${productId}/${req.file.filename}`;
    } catch (error) {
      console.error('Error moving file:', error);
      return res.status(500).json({ error: 'Error saving file to product folder' });
    }
  } else {
    imageUrl = `/uploads/${req.file.filename}`;
  }
  
  console.log('File uploaded to:', finalPath);
  console.log('Image URL returned:', imageUrl);
  
  res.json({ imageUrl: imageUrl });
});

// Personalities API - Get all personalities for a product
app.get('/api/products/:id/personalities', authenticateToken, (req, res) => {
  const { id } = req.params;

  // First check if table exists
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='personalities'", (err, tables) => {
    if (err) {
      console.error('Error checking personalities table:', err);
      return res.status(500).json({ error: 'Error checking personalities table: ' + err.message });
    }

    // If table doesn't exist, return empty array
    if (!tables || tables.length === 0) {
      console.log('Personalities table does not exist yet, returning empty array');
      return res.json({ personalities: [] });
    }

    // Table exists, fetch personalities
    db.all(`
      SELECT 
        id,
        product_id,
        name,
        image_url,
        created_at,
        updated_at
      FROM personalities
      WHERE product_id = ?
      ORDER BY name ASC
    `, [id], (err, personalities) => {
      if (err) {
        console.error('Error fetching personalities:', err);
        return res.status(500).json({ error: 'Error fetching personalities: ' + err.message });
      }
      res.json({ personalities: personalities || [] });
    });
  });
});

// Personalities API - Create personality
app.post('/api/products/:id/personalities', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, image_url } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Personality name is required' });
  }

  const trimmedName = name.trim();
  const productIdNum = parseInt(id);
  
  if (isNaN(productIdNum)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  // Verify product exists
  db.get('SELECT id FROM products WHERE id = ?', [productIdNum], (err, product) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking product' });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check for duplicate within this product
    db.get('SELECT id FROM personalities WHERE product_id = ? AND LOWER(name) = LOWER(?)', [productIdNum, trimmedName], (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Error checking for duplicate personality' });
      }
      if (existing) {
        return res.status(400).json({ error: 'A personality with this name already exists for this product' });
      }

      db.run('INSERT INTO personalities (product_id, name, image_url) VALUES (?, ?, ?)', [productIdNum, trimmedName, image_url || null], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error creating personality' });
        }
        res.status(201).json({ message: 'Personality created', id: this.lastID });
      });
    });
  });
});

// Personalities API - Update personality
app.put('/api/personalities/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, image_url } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Personality name is required' });
  }

  const trimmedName = name.trim();

  // Check if personality exists and get its product_id
  db.get('SELECT id, product_id FROM personalities WHERE id = ?', [id], (err, personality) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking personality' });
    }
    if (!personality) {
      return res.status(404).json({ error: 'Personality not found' });
    }

    // Check for duplicate within the same product (excluding current)
    db.get('SELECT id FROM personalities WHERE product_id = ? AND LOWER(name) = LOWER(?) AND id != ?', 
      [personality.product_id, trimmedName, id], 
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Error checking for duplicate personality' });
        }
        if (existing) {
          return res.status(400).json({ error: 'A personality with this name already exists for this product' });
        }

        db.run('UPDATE personalities SET name = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [trimmedName, image_url || null, id], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error updating personality' });
          }
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Personality not found' });
          }
          res.json({ message: 'Personality updated successfully' });
        });
      }
    );
  });
});

// Personalities API - Delete personality
app.delete('/api/personalities/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { productId } = req.query; // Get productId from query to validate ownership

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  const productIdNum = parseInt(productId);
  if (isNaN(productIdNum)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  // Check if personality exists and belongs to this product
  db.get('SELECT id, product_id FROM personalities WHERE id = ?', [id], (err, personality) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking personality' });
    }
    if (!personality) {
      return res.status(404).json({ error: 'Personality not found' });
    }
    if (personality.product_id !== productIdNum) {
      return res.status(403).json({ error: 'Personality does not belong to this product' });
    }

    db.run('DELETE FROM personalities WHERE id = ? AND product_id = ?', [id, productIdNum], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error deleting personality' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Personality not found' });
      }
      res.json({ message: 'Personality deleted successfully' });
    });
  });
});

// Product Categories API - Get categories for a product
app.get('/api/products/:id/categories', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.all(`
    SELECT 
      pc.id,
      pc.product_id,
      pc.category_id,
      pc.sub_category_id,
      c.name as category_name,
      sc.name as sub_category_name
    FROM product_categories pc
    INNER JOIN categories c ON pc.category_id = c.id
    LEFT JOIN sub_categories sc ON pc.sub_category_id = sc.id
    WHERE pc.product_id = ?
  `, [id], (err, productCategories) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching product categories' });
    }
    res.json({ categories: productCategories || [] });
  });
});

// Product Categories API - Assign categories to product
app.post('/api/products/:id/categories', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { categories } = req.body; // Array of { categoryId, subCategoryIds: [] }

  if (!Array.isArray(categories)) {
    return res.status(400).json({ error: 'Categories must be an array' });
  }

  // Check if product exists
  db.get('SELECT id FROM products WHERE id = ?', [id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking product' });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Ensure product_id is a number
    const productId = parseInt(id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    // Delete existing assignments for THIS SPECIFIC PRODUCT ONLY
    db.run('DELETE FROM product_categories WHERE product_id = ?', [productId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error removing existing category assignments' });
      }

      // Insert new assignments
      if (categories.length === 0) {
        return res.json({ message: 'Product categories updated successfully' });
      }

      const stmt = db.prepare('INSERT INTO product_categories (product_id, category_id, sub_category_id) VALUES (?, ?, ?)');
      let completed = 0;
      let hasError = false;
      let total = 0;

      // Calculate total first
      categories.forEach((cat) => {
        if (cat.subCategoryIds && cat.subCategoryIds.length > 0) {
          total += cat.subCategoryIds.length;
        } else {
          total += 1;
        }
      });

      if (total === 0) {
        stmt.finalize();
        return res.json({ message: 'Product categories updated successfully' });
      }

      categories.forEach((cat) => {
        const { categoryId, subCategoryIds } = cat;
        
        // Validate categoryId
        const validCategoryId = parseInt(categoryId);
        if (isNaN(validCategoryId)) {
          if (!hasError) {
            hasError = true;
            stmt.finalize();
            return res.status(400).json({ error: 'Invalid category ID' });
          }
          return;
        }
        
        if (!subCategoryIds || subCategoryIds.length === 0) {
          // No sub-categories, just assign category
          stmt.run([productId, validCategoryId, null], (err) => {
            if (err && !hasError) {
              hasError = true;
              stmt.finalize();
              return res.status(500).json({ error: 'Error assigning categories: ' + err.message });
            }
            completed++;
            if (completed === total && !hasError) {
              stmt.finalize();
              res.json({ message: 'Product categories updated successfully' });
            }
          });
        } else {
          // Assign category with each sub-category
          subCategoryIds.forEach((subCategoryId) => {
            const validSubCategoryId = parseInt(subCategoryId);
            if (isNaN(validSubCategoryId)) {
              if (!hasError) {
                hasError = true;
                stmt.finalize();
                return res.status(400).json({ error: 'Invalid sub-category ID' });
              }
              return;
            }
            
            stmt.run([productId, validCategoryId, validSubCategoryId], (err) => {
              if (err && !hasError) {
                hasError = true;
                stmt.finalize();
                return res.status(500).json({ error: 'Error assigning categories: ' + err.message });
              }
              completed++;
              if (completed === total && !hasError) {
                stmt.finalize();
                res.json({ message: 'Product categories updated successfully' });
              }
            });
          });
        }
      });
    });
  });
});

// Helper function to create and populate default template
function ensureDefaultTemplate(callback) {
  // Check if default template exists
  db.get('SELECT id FROM category_templates WHERE name = ?', ['Default Template'], (err, template) => {
    if (err) {
      return callback(err);
    }
    
    if (template) {
      // Check if it has categories
      db.get('SELECT COUNT(*) as count FROM template_categories WHERE template_id = ?', [template.id], (err, result) => {
        if (err) {
          return callback(err);
        }
        if (result.count > 0) {
          return callback(null, template.id); // Already populated
        }
        // Template exists but empty, populate it
        populateDefaultTemplate(template.id, callback);
      });
    } else {
      // Create default template
      db.run('INSERT INTO category_templates (name, description) VALUES (?, ?)', 
        ['Default Template', 'Default template with all categories and sub-categories'], 
        function(err) {
          if (err) {
            return callback(err);
          }
          populateDefaultTemplate(this.lastID, callback);
        }
      );
    }
  });
}

function populateDefaultTemplate(templateId, callback) {
  // Get all categories with their sub-categories
  db.all(`
    SELECT 
      c.id as category_id,
      c.display_order as category_order,
      sc.id as sub_category_id,
      sc.display_order as sub_category_order
    FROM categories c
    LEFT JOIN sub_categories sc ON c.id = sc.category_id
    ORDER BY c.display_order ASC, sc.display_order ASC
  `, (err, results) => {
    if (err) {
      return callback(err);
    }
    
    if (results.length === 0) {
      return callback(null, templateId); // No categories to add
    }
    
    // Group by category
    const categoryMap = {};
    results.forEach(row => {
      if (!categoryMap[row.category_id]) {
        categoryMap[row.category_id] = {
          categoryId: row.category_id,
          subCategories: []
        };
      }
      if (row.sub_category_id) {
        categoryMap[row.category_id].subCategories.push(row.sub_category_id);
      }
    });
    
    // Insert template categories
    const stmt = db.prepare('INSERT INTO template_categories (template_id, category_id, sub_category_id, display_order) VALUES (?, ?, ?, ?)');
    let completed = 0;
    let hasError = false;
    let orderCounter = 1;
    let total = 0;
    
    // Calculate total
    Object.values(categoryMap).forEach(cat => {
      if (cat.subCategories.length > 0) {
        total += cat.subCategories.length;
      } else {
        total += 1;
      }
    });
    
    if (total === 0) {
      stmt.finalize();
      return callback(null, templateId);
    }
    
    Object.values(categoryMap).forEach(cat => {
      if (cat.subCategories.length > 0) {
        cat.subCategories.forEach(subCategoryId => {
          stmt.run([templateId, cat.categoryId, subCategoryId, orderCounter++], (err) => {
            if (err && !hasError) {
              hasError = true;
              stmt.finalize();
              return callback(err);
            }
            completed++;
            if (completed === total && !hasError) {
              stmt.finalize();
              callback(null, templateId);
            }
          });
        });
      } else {
        stmt.run([templateId, cat.categoryId, null, orderCounter++], (err) => {
          if (err && !hasError) {
            hasError = true;
            stmt.finalize();
            return callback(err);
          }
          completed++;
          if (completed === total && !hasError) {
            stmt.finalize();
            callback(null, templateId);
          }
        });
      }
    });
  });
}

// Category Templates API - Get all templates
app.get('/api/category-templates', authenticateToken, (req, res) => {
  // Ensure default template exists and is populated
  ensureDefaultTemplate((err, templateId) => {
    if (err) {
      console.error('Error ensuring default template:', err);
    }
    
    // Fetch all templates
    db.all('SELECT * FROM category_templates ORDER BY name ASC', (err, templates) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching templates' });
      }
      res.json({ templates: templates || [] });
    });
  });
});

// Category Templates API - Get template with categories
app.get('/api/category-templates/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM category_templates WHERE id = ?', [id], (err, template) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching template' });
    }
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get categories for this template
    db.all(`
      SELECT 
        tc.id,
        tc.template_id,
        tc.category_id,
        tc.sub_category_id,
        tc.display_order,
        c.name as category_name,
        sc.name as sub_category_name
      FROM template_categories tc
      INNER JOIN categories c ON tc.category_id = c.id
      LEFT JOIN sub_categories sc ON tc.sub_category_id = sc.id
      WHERE tc.template_id = ?
      ORDER BY tc.display_order ASC
    `, [id], (err, templateCategories) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching template categories' });
      }
      res.json({ 
        template: template,
        categories: templateCategories || [] 
      });
    });
  });
});

// Category Templates API - Create template
app.post('/api/category-templates', authenticateToken, requireSuperAdmin, (req, res) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Template name is required' });
  }

  const trimmedName = name.trim();

  // Check for duplicate
  db.get('SELECT id FROM category_templates WHERE LOWER(name) = LOWER(?)', [trimmedName], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking for duplicate template' });
    }
    if (existing) {
      return res.status(400).json({ error: 'A template with this name already exists' });
    }

    db.run('INSERT INTO category_templates (name, description) VALUES (?, ?)', 
      [trimmedName, description || ''], 
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error creating template' });
        }
        res.status(201).json({ message: 'Template created', id: this.lastID });
      }
    );
  });
});

// Category Templates API - Update template
app.put('/api/category-templates/:id', authenticateToken, requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Template name is required' });
  }

  const trimmedName = name.trim();

  // Check if template exists
  db.get('SELECT id FROM category_templates WHERE id = ?', [id], (err, template) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking template' });
    }
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check for duplicate (excluding current)
    db.get('SELECT id FROM category_templates WHERE LOWER(name) = LOWER(?) AND id != ?', [trimmedName, id], (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Error checking for duplicate template' });
      }
      if (existing) {
        return res.status(400).json({ error: 'A template with this name already exists' });
      }

      db.run('UPDATE category_templates SET name = ?, description = ? WHERE id = ?', 
        [trimmedName, description || '', id], 
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Error updating template' });
          }
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Template not found' });
          }
          res.json({ message: 'Template updated successfully' });
        }
      );
    });
  });
});

// Category Templates API - Delete template
app.delete('/api/category-templates/:id', authenticateToken, requireSuperAdmin, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM category_templates WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error deleting template' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ message: 'Template deleted successfully' });
  });
});

// Category Templates API - Save template categories
app.post('/api/category-templates/:id/categories', authenticateToken, requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const { categories } = req.body; // Array of { categoryId, subCategoryIds: [], displayOrder }

  if (!Array.isArray(categories)) {
    return res.status(400).json({ error: 'Categories must be an array' });
  }

  // Check if template exists
  db.get('SELECT id FROM category_templates WHERE id = ?', [id], (err, template) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking template' });
    }
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Delete existing template categories
    db.run('DELETE FROM template_categories WHERE template_id = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error removing existing template categories' });
      }

      // Insert new template categories
      if (categories.length === 0) {
        return res.json({ message: 'Template categories updated successfully' });
      }

      const stmt = db.prepare('INSERT INTO template_categories (template_id, category_id, sub_category_id, display_order) VALUES (?, ?, ?, ?)');
      let completed = 0;
      let hasError = false;
      let total = 0;

      // Calculate total
      categories.forEach(cat => {
        if (cat.subCategoryIds && cat.subCategoryIds.length > 0) {
          total += cat.subCategoryIds.length;
        } else {
          total += 1; // Category without sub-categories
        }
      });

      if (total === 0) {
        stmt.finalize();
        return res.json({ message: 'Template categories updated successfully' });
      }

      categories.forEach((cat, catIndex) => {
        const { categoryId, subCategoryIds, displayOrder } = cat;
        const order = displayOrder !== undefined ? displayOrder : catIndex + 1;
        
        if (!subCategoryIds || subCategoryIds.length === 0) {
          // No sub-categories, just assign category
          stmt.run([id, categoryId, null, order], (err) => {
            if (err && !hasError) {
              hasError = true;
              stmt.finalize();
              return res.status(500).json({ error: 'Error saving template categories' });
            }
            completed++;
            if (completed === total && !hasError) {
              stmt.finalize();
              res.json({ message: 'Template categories updated successfully' });
            }
          });
        } else {
          // Assign category with each sub-category
          subCategoryIds.forEach((subCategoryId, subIndex) => {
            stmt.run([id, categoryId, subCategoryId, order], (err) => {
              if (err && !hasError) {
                hasError = true;
                stmt.finalize();
                return res.status(500).json({ error: 'Error saving template categories' });
              }
              completed++;
              if (completed === total && !hasError) {
                stmt.finalize();
                res.json({ message: 'Template categories updated successfully' });
              }
            });
          });
        }
      });
    });
  });
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

