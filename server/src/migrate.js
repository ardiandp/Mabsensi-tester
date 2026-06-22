import { getDb, saveDb } from './db.js';

export function runMigrations() {
  const db = getDb();

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      position TEXT DEFAULT 'Staff',
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS office_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius INTEGER NOT NULL DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      date_str TEXT NOT NULL,
      check_in_time TEXT,
      check_out_time TEXT,
      check_in_photo TEXT,
      check_out_photo TEXT,
      check_in_lat REAL,
      check_in_lng REAL,
      check_out_lat REAL,
      check_out_lng REAL,
      distance_check_in INTEGER,
      distance_check_out INTEGER,
      is_out_of_range_check_in INTEGER DEFAULT 0,
      is_out_of_range_check_out INTEGER,
      status TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  saveDb();
  console.log('Migrations completed');
}
