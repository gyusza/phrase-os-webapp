import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';

let sqlite: Database.Database;

// Allow cloud platforms (like Render/Fly.io) to override the dbPath to point to a Persistent Volume Mount
const dbPath = process.env.DATABASE_PATH 
    ? path.resolve(process.env.DATABASE_PATH)
    : path.resolve(process.cwd(), 'sqlite.db');

if (process.env.NODE_ENV === 'production') {
  sqlite = new Database(dbPath);
} else {
  if (!(global as any)._sqlite) {
    (global as any)._sqlite = new Database(dbPath);
  }
  sqlite = (global as any)._sqlite;
}

sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });
