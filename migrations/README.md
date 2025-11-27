# Database Migrations

This directory contains database migration files that manage schema changes over time.

## How It Works

1. **Migration Files**: Each migration is a numbered JavaScript file in `migrations/migrations/` directory
2. **Migration Runner**: `migrate.js` tracks which migrations have been executed
3. **Migrations Table**: A `migrations` table in the database tracks executed migrations
4. **Automatic Execution**: Migrations run automatically when the server starts

## Migration File Format

Each migration file should export an object with `up` and `down` functions:

```javascript
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('CREATE TABLE ...', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('DROP TABLE ...', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};
```

## Creating a New Migration

1. Create a new file in `migrations/migrations/` with the format: `XXX_description.js`
   - Use sequential numbers (005, 006, etc.)
   - Use descriptive names

2. Example: `005_add_user_avatar_column.js`

```javascript
module.exports = {
  up: async (db) => {
    return new Promise((resolve, reject) => {
      db.run('ALTER TABLE users ADD COLUMN avatar_url TEXT', (err) => {
        if (err) reject(err);
        else {
          console.log('  ✓ Added avatar_url column to users table');
          resolve();
        }
      });
    });
  },
  
  down: async (db) => {
    return new Promise((resolve, reject) => {
      // SQLite doesn't support DROP COLUMN, so this would need a workaround
      // For now, just log a warning
      console.log('  ⚠ SQLite does not support DROP COLUMN. Manual rollback required.');
      resolve();
    });
  }
};
```

## Running Migrations

### Automatic (Recommended)
Migrations run automatically when the server starts.

### Manual
```bash
npm run migrate
```

## Migration Execution Order

Migrations are executed in alphabetical/numerical order based on filename:
- `001_create_users_table.js`
- `002_create_products_table.js`
- `003_create_user_products_table.js`
- etc.

## Important Notes

1. **Never modify existing migrations** - Create new ones instead
2. **Test migrations** - Test both `up` and `down` functions
3. **Backup database** - Always backup before running migrations in production
4. **SQLite limitations** - Some operations (like DROP COLUMN) require workarounds

## Current Migrations

- `001_create_users_table.js` - Creates users table
- `002_create_products_table.js` - Creates products table
- `003_create_user_products_table.js` - Creates user_products junction table
- `004_create_default_admin.js` - Creates default super admin user

## Deployment

When deploying to production:
1. Migrations run automatically on server start
2. Only pending migrations are executed
3. Executed migrations are tracked in the `migrations` table
4. Failed migrations stop the process (check logs)

