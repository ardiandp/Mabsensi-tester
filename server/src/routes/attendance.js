import { Router } from 'express';
import { queryAll, queryOne, execute } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const toLocaleDateStr = (date) => {
  return date.toLocaleDateString('id-ID', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
};

const toLocaleTimeStr = (date) => {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

router.get('/', (req, res) => {
  try {
    let logs;
    if (req.user.role === 'admin') {
      logs = queryAll('SELECT * FROM attendance ORDER BY date DESC');
    } else {
      logs = queryAll('SELECT * FROM attendance WHERE user_id = ? ORDER BY date DESC', [req.user.id]);
    }
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/today', (req, res) => {
  try {
    const dateStr = toLocaleDateStr(new Date());
    const log = queryOne(
      'SELECT * FROM attendance WHERE user_id = ? AND date_str = ?',
      [req.user.id, dateStr]
    );
    res.json({ log: log || null });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/checkin', (req, res) => {
  try {
    const { photo, lat, lng } = req.body;
    const now = new Date();
    const dateStr = toLocaleDateStr(now);

    const existing = queryOne(
      'SELECT id FROM attendance WHERE user_id = ? AND date_str = ?',
      [req.user.id, dateStr]
    );

    if (existing) {
      return res.status(400).json({ message: 'Anda sudah melakukan Check-in hari ini!' });
    }

    const office = queryOne('SELECT * FROM office_config LIMIT 1');
    if (!office) {
      return res.status(500).json({ message: 'Office not configured' });
    }

    const distance = calculateDistance(lat, lng, office.latitude, office.longitude);
    const isOutOfRange = distance > office.radius;

    const limitTime = new Date();
    limitTime.setHours(8, 30, 0);
    const isLate = now > limitTime;

    execute(
      `INSERT INTO attendance (user_id, date, date_str, check_in_time, check_out_time,
       check_in_photo, check_out_photo, check_in_lat, check_in_lng,
       check_out_lat, check_out_lng, distance_check_in, distance_check_out,
       is_out_of_range_check_in, is_out_of_range_check_out, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, now.toISOString(), dateStr,
       toLocaleTimeStr(now), null,
       photo, null, lat, lng,
       null, null, Math.round(distance), null,
       isOutOfRange ? 1 : 0, null,
       isLate ? 'Terlambat' : 'Tepat Waktu',
       isOutOfRange ? 'Absen di luar radius kantor' : '']
    );

    const log = queryOne(
      'SELECT * FROM attendance WHERE user_id = ? AND date_str = ?',
      [req.user.id, dateStr]
    );
    res.json({ log });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/checkout', (req, res) => {
  try {
    const { photo, lat, lng } = req.body;
    const now = new Date();
    const dateStr = toLocaleDateStr(now);

    const log = queryOne(
      'SELECT * FROM attendance WHERE user_id = ? AND date_str = ?',
      [req.user.id, dateStr]
    );

    if (!log) {
      return res.status(400).json({ message: 'Anda belum melakukan Check-in hari ini!' });
    }

    if (log.check_out_time) {
      return res.status(400).json({ message: 'Anda sudah melakukan Check-out hari ini!' });
    }

    const office = queryOne('SELECT * FROM office_config LIMIT 1');
    const distance = calculateDistance(lat, lng, office.latitude, office.longitude);
    const isOutOfRange = distance > office.radius;

    const notes = (log.notes || '') +
      (isOutOfRange
        ? (log.notes ? '; ' : '') + 'Check-out di luar radius kantor'
        : '');

    execute(
      `UPDATE attendance SET check_out_time = ?, check_out_photo = ?,
       check_out_lat = ?, check_out_lng = ?, distance_check_out = ?,
       is_out_of_range_check_out = ?, notes = ?
       WHERE id = ?`,
      [toLocaleTimeStr(now), photo, lat, lng, Math.round(distance),
       isOutOfRange ? 1 : 0, notes, log.id]
    );

    const updatedLog = queryOne('SELECT * FROM attendance WHERE id = ?', [log.id]);
    res.json({ log: updatedLog });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/stats', (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const now = new Date();
    const todayStr = toLocaleDateStr(now);

    const employees = queryAll("SELECT * FROM users WHERE role = 'employee'");
    const logs = queryAll('SELECT * FROM attendance ORDER BY date DESC');
    const todayLogs = logs.filter(l => l.date_str === todayStr);

    const stats = {
      totalEmployees: employees.length,
      checkedInToday: todayLogs.length,
      lateToday: todayLogs.filter(l => l.status === 'Terlambat').length,
      absentToday: Math.max(0, employees.length - todayLogs.length),
      logs: logs.map(log => {
        const user = employees.find(u => u.id === log.user_id);
        return {
          ...log,
          userName: user ? user.name : 'Unknown',
          userPosition: user ? user.position : 'Unknown',
          userAvatar: user ? user.avatar : ''
        };
      })
    };

    res.json({ stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
