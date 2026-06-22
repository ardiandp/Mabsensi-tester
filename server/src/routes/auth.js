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

    if (!user) {
      return res.status(401).json({ message: 'Username atau password salah!' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Username atau password salah!' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    const { password: _, ...userData } = user;
    res.json({ token, user: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, name, position } = req.body;

    const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ message: 'Username sudah terdaftar!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000)}?w=150`;

    execute(
      'INSERT INTO users (username, password, name, role, position, avatar) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, name, 'employee', position || 'Staff', avatar]
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
    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    const { password: _, ...userData } = user;
    res.json({ user: userData });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
