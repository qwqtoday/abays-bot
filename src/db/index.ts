import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';
import * as schema from './schema.js';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const log = createLogger('db');

const dbPath = config.database.path;
const dbDir = dirname(dbPath);

if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
  log.info(`Created database directory: ${dbDir}`);
}

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

log.info(`Connected to SQLite database at ${dbPath}`);

function initializeTables() {
  log.info('Initializing database tables...');
  
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS kits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      home_name TEXT NOT NULL,
      chest_x REAL NOT NULL,
      chest_y REAL NOT NULL,
      chest_z REAL NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      kit_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      FOREIGN KEY (kit_id) REFERENCES kits(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_kit_id ON orders(kit_id);
  `);
  
  log.info('Database tables initialized');
}

initializeTables();