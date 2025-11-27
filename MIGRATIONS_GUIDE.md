# Database Migrations Guide

## Overview

The project now uses a database migration system to manage schema changes. This ensures that when you deploy updates to production, the database schema is automatically updated.

## How It Works

1. **Automatic Execution**: Migrations run automatically when the server starts
2. **Tracking**: A `migrations` table tracks which migrations have been executed
3. **Idempotent**: Each migration only runs once, even if the server restarts
4. **Safe**: Failed migrations are logged and the server continues (with fallback)

## Migration Files

All migration files are in `migrations/migrations/` directory:

- `001_create_users_table.js` - Creates users table
- `002_create_products_table.js` - Creates products table
- `003_create_user_products_table.js` - Creates user_products junction table
- `004_create_default_admin.js` - Creates default super admin user

## Creating a New Migration

When you need to change the database schema:

1. **Create a new migration file** in `migrations/migrations/`:
   - Format: `XXX_description.js` (use next sequential number)
   - Example: `005_add_user_avatar_column.js`

2. **Write the migration**:

```javascript
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('ALTER TABLE users ADD COLUMN avatar_url TEXT', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('  ✓ Added avatar_url column to users table');
          resolve();
        }
      });
    });
  },
  
  down: async (db) => {
    // Optional: Rollback migration
    return new Promise((resolve, reject) => {
      // SQLite doesn't support DROP COLUMN directly
      // Would need to recreate table or use workaround
      console.log('  ⚠ Rollback not implemented for this migration');
      resolve();
    });
  }
};
```

3. **Test locally**:
   ```bash
   npm run migrate
   ```

4. **Commit and push** - Migrations will run automatically on deployment

## Deployment Process

### On Render/Production:

1. **Push your code** with new migration files
2. **Server starts** and automatically runs migrations
3. **Only pending migrations** are executed
4. **Database is updated** before the server accepts requests

### Manual Migration (if needed):

```bash
npm run migrate
```

## Migration Execution Flow

```
Server Start
    ↓
Connect to Database
    ↓
Check migrations table
    ↓
Find all migration files
    ↓
Compare with executed migrations
    ↓
Run pending migrations (in order)
    ↓
Mark as executed
    ↓
Server ready
```

## Important Notes

### ✅ Do:
- Always create new migrations for schema changes
- Test migrations locally before deploying
- Use sequential numbering (005, 006, etc.)
- Include descriptive names
- Add console.log messages for clarity

### ❌ Don't:
- Modify existing migration files
- Skip migration numbers
- Delete migration files (they're tracked)
- Run migrations manually in production (they run automatically)

## SQLite Limitations

SQLite has some limitations:
- **No DROP COLUMN** - Requires recreating table
- **Limited ALTER TABLE** - Only supports ADD COLUMN, RENAME TABLE
- **No transactions across DDL** - Some operations can't be rolled back

For complex changes, you may need to:
1. Create new table with new schema
2. Copy data
3. Drop old table
4. Rename new table

## Troubleshooting

### Migration fails on deployment:
1. Check server logs for error messages
2. Verify migration file syntax
3. Test migration locally first
4. Server falls back to legacy initialization if migration fails

### Migration already executed:
- Migrations are tracked in `migrations` table
- Each migration runs only once
- Safe to restart server multiple times

### Need to rollback:
- Check if migration has `down` function
- SQLite limitations may prevent full rollback
- Consider creating a new migration to fix issues

## Example: Adding a New Column

```javascript
// migrations/migrations/005_add_user_phone.js
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('ALTER TABLE users ADD COLUMN phone TEXT', (err) => {
        if (err) reject(err);
        else {
          console.log('  ✓ Added phone column to users table');
          resolve();
        }
      });
    });
  },
  
  down: async (db) => {
    // SQLite doesn't support DROP COLUMN
    console.log('  ⚠ Rollback requires manual table recreation');
    resolve();
  }
};
```

## Current Schema

The current database schema includes:
- **users** - User accounts with roles
- **products** - Product catalog
- **user_products** - Many-to-many relationship between users and products
- **migrations** - Migration tracking table

## Next Steps

When you need to change the schema:
1. Create a new migration file
2. Test it locally
3. Commit and push
4. Deploy - migrations run automatically!

For more details, see `migrations/README.md`.

