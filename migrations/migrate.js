const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

/**
 * Migration runner for SQLite database
 * Tracks and executes pending migrations
 */
class MigrationRunner {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async createMigrationsTable() {
    await this.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getExecutedMigrations() {
    const rows = await this.all('SELECT name FROM migrations ORDER BY id');
    return rows.map(row => row.name);
  }

  getMigrationFiles() {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }
    
    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.js') && file !== 'migrate.js')
      .sort();
    
    return files;
  }

  async executeMigration(migrationFile) {
    const migrationPath = path.join(this.migrationsDir, migrationFile);
    const migration = require(migrationPath);
    
    console.log(`Running migration: ${migrationFile}`);
    
    try {
      if (typeof migration.up === 'function') {
        await migration.up(this.db);
        await this.run('INSERT INTO migrations (name) VALUES (?)', [migrationFile]);
        console.log(`✓ Migration ${migrationFile} completed successfully`);
      } else {
        throw new Error(`Migration ${migrationFile} does not export an 'up' function`);
      }
    } catch (error) {
      console.error(`✗ Migration ${migrationFile} failed:`, error.message);
      throw error;
    }
  }

  async runMigrations() {
    await this.connect();
    
    try {
      await this.createMigrationsTable();
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = this.getMigrationFiles();
      
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(file)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('No pending migrations');
        return;
      }
      
      console.log(`Found ${pendingMigrations.length} pending migration(s)`);
      
      for (const migrationFile of pendingMigrations) {
        await this.executeMigration(migrationFile);
      }
      
      console.log('All migrations completed successfully');
    } finally {
      await this.close();
    }
  }
}

// Run migrations if called directly
if (require.main === module) {
  const dbPath = process.env.DATABASE_PATH || './shop.db';
  const runner = new MigrationRunner(dbPath);
  
  runner.runMigrations()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = MigrationRunner;

