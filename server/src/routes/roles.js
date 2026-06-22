import { Router } from 'express';
import { queryAll, queryOne, execute } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    const roles = queryAll('SELECT * FROM roles ORDER BY name ASC');
    res.json({ roles });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const { name, description } = req.body;
    const existing = queryOne('SELECT id FROM roles WHERE name = ?', [name]);
    if (existing) return res.status(400).json({ message: 'Nama role sudah ada!' });
    execute('INSERT INTO roles (name, description) VALUES (?, ?)', [name, description || '']);
    const role = queryOne('SELECT * FROM roles WHERE name = ?', [name]);
    res.json({ role });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.put('/:id', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const { name, description, is_active } = req.body;
    const role = queryOne('SELECT * FROM roles WHERE id = ?', [req.params.id]);
    if (!role) return res.status(404).json({ message: 'Not found' });
    execute('UPDATE roles SET name=?, description=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [name || role.name, description ?? role.description, is_active ?? role.is_active, req.params.id]);
    res.json({ role: queryOne('SELECT * FROM roles WHERE id = ?', [req.params.id]) });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.delete('/:id', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const userCount = queryOne('SELECT COUNT(*) as count FROM users WHERE role_id = ?', [req.params.id]);
    if (userCount.count > 0) return res.status(400).json({ message: 'Masih ada karyawan dengan role ini!' });
    execute('DELETE FROM roles WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

export default router;
