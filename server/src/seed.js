import bcrypt from 'bcryptjs';
import { getDb, queryOne, saveDb } from './db.js';

export async function runSeeds() {
  const db = getDb();
  const userCount = queryOne('SELECT COUNT(*) as count FROM users');
  if (userCount.count > 0) {
    console.log('Database already seeded, skipping');
    return;
  }

  const hashedPassword = await bcrypt.hash('password', 10);

  // Roles
  db.run("INSERT INTO roles (name, description) VALUES ('admin', 'Administrator sistem')");
  db.run("INSERT INTO roles (name, description) VALUES ('employee', 'Karyawan biasa')");

  // Departments
  db.run("INSERT INTO departments (name, code, description) VALUES ('Teknologi Informasi', 'IT', 'Divisi Teknologi Informasi')");
  db.run("INSERT INTO departments (name, code, description) VALUES ('Sumber Daya Manusia', 'HR', 'Divisi Sumber Daya Manusia')");
  db.run("INSERT INTO departments (name, code, description) VALUES ('Keuangan', 'FIN', 'Divisi Keuangan')");

  // Shifts
  db.run("INSERT INTO shifts (name, code, check_in_start, check_in_end, check_out_start, check_out_end, work_hours, tolerance_min) VALUES ('Pagi', 'PGI', '06:00', '08:30', '16:00', '18:00', 8, 0)");
  db.run("INSERT INTO shifts (name, code, check_in_start, check_in_end, check_out_start, check_out_end, work_hours, tolerance_min) VALUES ('Siang', 'SIA', '13:00', '14:00', '21:00', '23:00', 8, 0)");
  db.run("INSERT INTO shifts (name, code, check_in_start, check_in_end, check_out_start, check_out_end, work_hours, tolerance_min) VALUES ('Malam', 'MAL', '21:00', '22:00', '05:00', '07:00', 8, 0)");

  // Locations (Lokasi Absensi)
  db.run("INSERT INTO locations (name, address, latitude, longitude, radius) VALUES ('Kantor Pusat Jakarta', 'Jl. MH Thamrin No. 1, Jakarta Pusat', -6.2008406, 106.8273081, 100)");
  db.run("INSERT INTO locations (name, address, latitude, longitude, radius) VALUES ('Cabang Bandung', 'Jl. Asia Afrika No. 45, Bandung', -6.921373, 107.607215, 100)");
  db.run("INSERT INTO locations (name, address, latitude, longitude, radius) VALUES ('Cabang Surabaya', 'Jl. Tunjungan No. 12, Surabaya', -7.257472, 112.752088, 100)");

  // Users
  db.run(
    `INSERT INTO users (username, password, name, role, role_id, department_id, shift_id, position, avatar, nik, phone, email, address, is_active, join_date)
     VALUES (?, ?, ?, ?, (SELECT id FROM roles WHERE name='employee'), (SELECT id FROM departments WHERE code='IT'), (SELECT id FROM shifts WHERE code='PGI'), ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['karyawan', hashedPassword, 'Ahmad Fauzi', 'employee', 'Software Engineer',
     'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
     'NIK-001', '081234567890', 'ahmad.fauzi@email.com', 'Jl. Merdeka No. 10, Jakarta', 1, '2024-01-15']
  );

  db.run(
    `INSERT INTO users (username, password, name, role, role_id, department_id, shift_id, position, avatar, nik, phone, email, address, is_active, join_date)
     VALUES (?, ?, ?, ?, (SELECT id FROM roles WHERE name='admin'), (SELECT id FROM departments WHERE code='HR'), (SELECT id FROM shifts WHERE code='PGI'), ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['admin', hashedPassword, 'Siti Rahma', 'admin', 'HR Manager',
     'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
     'NIK-002', '081298765432', 'siti.rahma@email.com', 'Jl. Sudirman No. 25, Jakarta', 1, '2023-06-01']
  );

  // Office config (legacy - keep for backward compat)
  const hasOffice = queryOne('SELECT COUNT(*) as count FROM office_config');
  if (hasOffice.count === 0) {
    db.run("INSERT INTO office_config (name, latitude, longitude, radius) VALUES ('Kantor Pusat Jakarta', -6.2008406, 106.8273081, 100)");
  }

  saveDb();
  console.log('Seed data inserted');
}
