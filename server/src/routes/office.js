import { Router } from 'express';
import { queryOne, execute } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    let config = queryOne('SELECT * FROM office_config LIMIT 1');
    if (!config) {
      execute(
        'INSERT INTO office_config (name, latitude, longitude, radius) VALUES (?, ?, ?, ?)',
        ['Kantor Pusat Jakarta', -6.2008406, 106.8273081, 100]
      );
      config = queryOne('SELECT * FROM office_config LIMIT 1');
    }
    res.json({ config });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/', (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, latitude, longitude, radius } = req.body;
    const existing = queryOne('SELECT id FROM office_config LIMIT 1');

    if (existing) {
      execute(
        'UPDATE office_config SET name = ?, latitude = ?, longitude = ?, radius = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, latitude, longitude, radius, existing.id]
      );
    } else {
      execute(
        'INSERT INTO office_config (name, latitude, longitude, radius) VALUES (?, ?, ?, ?)',
        [name, latitude, longitude, radius]
      );
    }

    const config = queryOne('SELECT * FROM office_config LIMIT 1');
    res.json({ config });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
