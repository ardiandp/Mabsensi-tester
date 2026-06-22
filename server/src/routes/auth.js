import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne, execute } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mabsensi-secret-key-change-in-production';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return res.status(401).json({ message: 'Username atau password salah!' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Username atau password salah!' });
    if (!user.is_active && user.is_active !== null) return res.status(403).json({ message: 'Akun Anda dinonaktifkan!' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    const enriched = queryOne(`
      SELECT u.*, d.name as department_name, r.name as role_name, s.name as shift_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN shifts s ON u.shift_id = s.id
      WHERE u.id = ?
    `, [user.id]);
    const { password: _, ...userData } = enriched;
    res.json({ token, user: userData });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, name, position, nik, phone, email, address, department_id, role_id, shift_id, avatar: avatarUrl } = req.body;

    const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.status(400).json({ message: 'Username sudah terdaftar!' });
    if (nik) {
      const existingNik = queryOne('SELECT id FROM users WHERE nik = ?', [nik]);
      if (existingNik) return res.status(400).json({ message: 'NIK sudah digunakan!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = avatarUrl || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000)}?w=150`;

    execute(
      `INSERT INTO users (username, password, name, role, position, avatar, nik, phone, email, address, department_id, role_id, shift_id, is_active)
       VALUES (?, ?, ?, 'employee', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [username, hashedPassword, name, position || 'Staff', avatar, nik || null, phone || null, email || null, address || null, department_id || null, role_id || null, shift_id || null]
    );

    const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
    const { password: _, ...userData } = user;
    res.json({ user: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/session', authMiddleware, (req, res) => {
  try {
    const user = queryOne(`
      SELECT u.*, d.name as department_name, r.name as role_name, s.name as shift_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN shifts s ON u.shift_id = s.id
      WHERE u.id = ?
    `, [req.user.id]);
    if (!user) return res.status(401).json({ message: 'User not found' });
    const { password: _, ...userData } = user;
    res.json({ user: userData });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
