import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
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
