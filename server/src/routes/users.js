import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { queryAll, queryOne, execute } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const users = queryAll('SELECT id, username, name, role, position, avatar, created_at, updated_at FROM users ORDER BY name ASC');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const user = queryOne('SELECT id, username, name, role, position, avatar, created_at, updated_at FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { username, name, password, position, avatar } = req.body;
    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (username && username !== user.username) {
      const existing = queryOne('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.params.id]);
      if (existing) return res.status(400).json({ message: 'Username sudah digunakan!' });
    }

    const updates = {};
    if (username) updates.username = username;
    if (name) updates.name = name;
    if (position) updates.position = position;
    if (avatar !== undefined) updates.avatar = avatar;
    if (password) updates.password = await bcrypt.hash(password, 10);

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);

    execute(`UPDATE users SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, req.params.id]);

    const updated = queryOne('SELECT id, username, name, role, position, avatar, created_at, updated_at FROM users WHERE id = ?', [req.params.id]);
    res.json({ user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Tidak bisa menghapus akun admin!' });

    execute('DELETE FROM attendance WHERE user_id = ?', [req.params.id]);
    execute('DELETE FROM users WHERE id = ?', [req.params.id]);

    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
