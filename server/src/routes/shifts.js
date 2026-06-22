import { Router } from 'express';
import { queryAll, queryOne, execute } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    const shifts = queryAll('SELECT * FROM shifts ORDER BY check_in_start ASC');
    res.json({ shifts });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const { name, code, check_in_start, check_in_end, check_out_start, check_out_end, work_hours, tolerance_min } = req.body;
    const existing = queryOne('SELECT id FROM shifts WHERE code = ?', [code]);
    if (existing) return res.status(400).json({ message: 'Kode shift sudah ada!' });
    execute('INSERT INTO shifts (name, code, check_in_start, check_in_end, check_out_start, check_out_end, work_hours, tolerance_min) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, code, check_in_start, check_in_end, check_out_start, check_out_end, work_hours || 8, tolerance_min || 0]);
    const shift = queryOne('SELECT * FROM shifts WHERE code = ?', [code]);
    res.json({ shift });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.put('/:id', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const s = queryOne('SELECT * FROM shifts WHERE id = ?', [req.params.id]);
    if (!s) return res.status(404).json({ message: 'Not found' });
    const { name, code, check_in_start, check_in_end, check_out_start, check_out_end, work_hours, tolerance_min, is_active } = req.body;
    execute(`UPDATE shifts SET name=?, code=?, check_in_start=?, check_in_end=?, check_out_start=?, check_out_end=?, work_hours=?, tolerance_min=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [name || s.name, code || s.code, check_in_start || s.check_in_start, check_in_end || s.check_in_end,
       check_out_start || s.check_out_start, check_out_end || s.check_out_end,
       work_hours ?? s.work_hours, tolerance_min ?? s.tolerance_min, is_active ?? s.is_active, req.params.id]);
    res.json({ shift: queryOne('SELECT * FROM shifts WHERE id = ?', [req.params.id]) });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.delete('/:id', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const userCount = queryOne('SELECT COUNT(*) as count FROM users WHERE shift_id = ?', [req.params.id]);
    if (userCount.count > 0) return res.status(400).json({ message: 'Masih ada karyawan dengan shift ini!' });
    execute('DELETE FROM shifts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

export default router;
