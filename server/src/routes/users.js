import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { queryAll, queryOne, execute } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const users = queryAll(`
      SELECT u.id, u.username, u.name, u.role, u.position, u.avatar,
             u.nik, u.phone, u.email, u.address, u.is_active, u.join_date,
             u.department_id, d.name as department_name, d.code as department_code,
             u.role_id, r.name as role_name,
             u.shift_id, s.name as shift_name, s.code as shift_code,
             u.created_at, u.updated_at
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN shifts s ON u.shift_id = s.id
      ORDER BY u.name ASC
    `);
    res.json({ users });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/:id', (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.id != req.params.id)
      return res.status(403).json({ message: 'Access denied' });
    const user = queryOne(`
      SELECT u.*, d.name as department_name, r.name as role_name, s.name as shift_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN shifts s ON u.shift_id = s.id
      WHERE u.id = ?
    `, [req.params.id]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password, ...userData } = user;
    res.json({ user: userData });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { username, name, password, position, avatar, nik, phone, email, address, is_active, join_date, department_id, role_id, shift_id } = req.body;

    if (username && username !== user.username) {
      const existing = queryOne('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.params.id]);
      if (existing) return res.status(400).json({ message: 'Username sudah digunakan!' });
    }
    if (nik && nik !== user.nik) {
      const existing = queryOne('SELECT id FROM users WHERE nik = ? AND id != ?', [nik, req.params.id]);
      if (existing) return res.status(400).json({ message: 'NIK sudah digunakan!' });
    }

    const updates = {};
    if (username !== undefined) updates.username = username;
    if (name !== undefined) updates.name = name;
    if (position !== undefined) updates.position = position;
    if (avatar !== undefined) updates.avatar = avatar;
    if (nik !== undefined) updates.nik = nik;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (address !== undefined) updates.address = address;
    if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;
    if (join_date !== undefined) updates.join_date = join_date;
    if (department_id !== undefined) updates.department_id = department_id;
    if (role_id !== undefined) updates.role_id = role_id;
    if (shift_id !== undefined) updates.shift_id = shift_id;
    if (password) updates.password = await bcrypt.hash(password, 10);

    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      const values = Object.values(updates);
      execute(`UPDATE users SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, req.params.id]);
    }

    const updated = queryOne(`
      SELECT u.*, d.name as department_name, r.name as role_name, s.name as shift_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN shifts s ON u.shift_id = s.id
      WHERE u.id = ?
    `, [req.params.id]);
    const { password: _, ...userData } = updated;
    res.json({ user: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Tidak bisa menghapus akun admin!' });
    execute('DELETE FROM attendance WHERE user_id = ?', [req.params.id]);
    execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

export default router;
