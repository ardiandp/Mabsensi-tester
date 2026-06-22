import bcrypt from 'bcryptjs';
import { getDb, queryOne, execute, saveDb } from './db.js';

export async function runSeeds() {
  const db = getDb();
  const userCount = queryOne('SELECT COUNT(*) as count FROM users');

  if (userCount.count > 0) {
    console.log('Database already seeded, skipping');
    return;
  }

  const hashedPassword = await bcrypt.hash('password', 10);

  db.run(
    'INSERT INTO users (username, password, name, role, position, avatar) VALUES (?, ?, ?, ?, ?, ?)',
    ['karyawan', hashedPassword, 'Ahmad Fauzi', 'employee', 'Software Engineer',
     'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150']
  );

  db.run(
    'INSERT INTO users (username, password, name, role, position, avatar) VALUES (?, ?, ?, ?, ?, ?)',
    ['admin', hashedPassword, 'Siti Rahma', 'admin', 'HR Manager',
     'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150']
  );

  db.run(
    'INSERT INTO office_config (name, latitude, longitude, radius) VALUES (?, ?, ?, ?)',
    ['Kantor Pusat Jakarta', -6.2008406, 106.8273081, 100]
  );

  saveDb();
  console.log('Seed data inserted');
}
