import { getDb, saveDb } from './db.js';

function tableExists(name) {
  const r = getDb().exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`);
  return r.length > 0 && r[0].values.length > 0;
}

function columnExists(table, col) {
  const r = getDb().exec(`PRAGMA table_info('${table}')`);
  if (r.length === 0) return false;
  const cols = r[0].values.map(v => v[1]);
  return cols.includes(col);
}

export function runMigrations() {
  const db = getDb();
  db.run('PRAGMA foreign_keys = ON');

  // --- Existing tables (unchanged) ---
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    position TEXT DEFAULT 'Staff',
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS office_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius INTEGER NOT NULL DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS attendance (
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
  )`);

  // --- NEW TABLES ---

  // Departments (Bagian)
  db.run(`CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Locations (Lokasi Absensi)
  db.run(`CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius INTEGER NOT NULL DEFAULT 100,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Roles (Role dinamis)
  db.run(`CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Shifts (Shift kerja)
  db.run(`CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    check_in_start TEXT NOT NULL,
    check_in_end TEXT NOT NULL,
    check_out_start TEXT NOT NULL,
    check_out_end TEXT NOT NULL,
    work_hours REAL DEFAULT 8,
    tolerance_min INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // --- ALTER EXISTING TABLES ---

  // users: add new columns if not exist
  if (!columnExists('users', 'nik')) {
    db.run("ALTER TABLE users ADD COLUMN nik TEXT UNIQUE");
  }
  if (!columnExists('users', 'department_id')) {
    db.run("ALTER TABLE users ADD COLUMN department_id INTEGER REFERENCES departments(id)");
  }
  if (!columnExists('users', 'role_id')) {
    db.run("ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id)");
  }
  if (!columnExists('users', 'shift_id')) {
    db.run("ALTER TABLE users ADD COLUMN shift_id INTEGER REFERENCES shifts(id)");
  }
  if (!columnExists('users', 'phone')) {
    db.run("ALTER TABLE users ADD COLUMN phone TEXT");
  }
  if (!columnExists('users', 'email')) {
    db.run("ALTER TABLE users ADD COLUMN email TEXT");
  }
  if (!columnExists('users', 'address')) {
    db.run("ALTER TABLE users ADD COLUMN address TEXT");
  }
  if (!columnExists('users', 'is_active')) {
    db.run("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1");
  }
  if (!columnExists('users', 'join_date')) {
    db.run("ALTER TABLE users ADD COLUMN join_date TEXT");
  }

  // attendance: add location_id if not exist
  if (!columnExists('attendance', 'location_id')) {
    db.run("ALTER TABLE attendance ADD COLUMN location_id INTEGER REFERENCES locations(id)");
  }
  if (!columnExists('attendance', 'late_minutes')) {
    db.run("ALTER TABLE attendance ADD COLUMN late_minutes INTEGER DEFAULT 0");
  }

  saveDb();
  console.log('Migrations completed');
}
