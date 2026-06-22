import { Router } from 'express';
import { queryAll, queryOne, execute } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    const depts = queryAll('SELECT * FROM departments ORDER BY name ASC');
    res.json({ departments: depts });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const { name, code, description } = req.body;
    const existing = queryOne('SELECT id FROM departments WHERE code = ?', [code]);
    if (existing) return res.status(400).json({ message: 'Kode bagian sudah digunakan!' });
    execute('INSERT INTO departments (name, code, description) VALUES (?, ?, ?)', [name, code, description || '']);
    const dept = queryOne('SELECT * FROM departments WHERE code = ?', [code]);
    res.json({ department: dept });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.put('/:id', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const { name, code, description, is_active } = req.body;
    const dept = queryOne('SELECT * FROM departments WHERE id = ?', [req.params.id]);
    if (!dept) return res.status(404).json({ message: 'Not found' });
    execute('UPDATE departments SET name=?, code=?, description=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [name || dept.name, code || dept.code, description ?? dept.description, is_active ?? dept.is_active, req.params.id]);
    res.json({ department: queryOne('SELECT * FROM departments WHERE id = ?', [req.params.id]) });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.delete('/:id', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const empCount = queryOne('SELECT COUNT(*) as count FROM users WHERE department_id = ?', [req.params.id]);
    if (empCount.count > 0) return res.status(400).json({ message: 'Masih ada karyawan di bagian ini!' });
    execute('DELETE FROM departments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

export default router;
