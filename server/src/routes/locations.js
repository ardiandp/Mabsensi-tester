import { Router } from 'express';
import { queryAll, queryOne, execute } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    const locs = queryAll('SELECT * FROM locations ORDER BY name ASC');
    res.json({ locations: locs });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const { name, address, latitude, longitude, radius } = req.body;
    execute('INSERT INTO locations (name, address, latitude, longitude, radius) VALUES (?, ?, ?, ?, ?)',
      [name, address || '', latitude, longitude, radius || 100]);
    const loc = queryOne('SELECT * FROM locations ORDER BY id DESC LIMIT 1');
    res.json({ location: loc });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.put('/:id', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    const { name, address, latitude, longitude, radius, is_active } = req.body;
    const loc = queryOne('SELECT * FROM locations WHERE id = ?', [req.params.id]);
    if (!loc) return res.status(404).json({ message: 'Not found' });
    execute('UPDATE locations SET name=?, address=?, latitude=?, longitude=?, radius=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [name ?? loc.name, address ?? loc.address, latitude ?? loc.latitude, longitude ?? loc.longitude, radius ?? loc.radius, is_active ?? loc.is_active, req.params.id]);
    res.json({ location: queryOne('SELECT * FROM locations WHERE id = ?', [req.params.id]) });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.delete('/:id', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    execute('DELETE FROM locations WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

export default router;
