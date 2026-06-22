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

function toLocaleDateStr(date) {
  return date.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function toLocaleTimeStr(date) {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function timeStrToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function findNearestLocation(lat, lng) {
  const locs = queryAll('SELECT * FROM locations WHERE is_active = 1');
  let best = null;
  let bestDist = Infinity;
  for (const loc of locs) {
    const dist = calculateDistance(lat, lng, loc.latitude, loc.longitude);
    if (dist <= loc.radius && dist < bestDist) {
      best = loc;
      bestDist = dist;
    }
  }
  return { location: best, distance: Math.round(bestDist), inRange: best !== null };
}

router.get('/', (req, res) => {
  try {
    let logs;
    if (req.user.role === 'admin') {
      logs = queryAll(`
        SELECT a.*, l.name as location_name
        FROM attendance a
        LEFT JOIN locations l ON a.location_id = l.id
        ORDER BY a.date DESC
      `);
    } else {
      logs = queryAll(`
        SELECT a.*, l.name as location_name
        FROM attendance a
        LEFT JOIN locations l ON a.location_id = l.id
        WHERE a.user_id = ? ORDER BY a.date DESC
      `, [req.user.id]);
    }
    res.json({ logs });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/today', (req, res) => {
  try {
    const dateStr = toLocaleDateStr(new Date());
    const log = queryOne(`
      SELECT a.*, l.name as location_name
      FROM attendance a
      LEFT JOIN locations l ON a.location_id = l.id
      WHERE a.user_id = ? AND a.date_str = ?
    `, [req.user.id, dateStr]);
    res.json({ log: log || null });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/checkin', (req, res) => {
  try {
    const { photo, lat, lng } = req.body;
    const now = new Date();
    const dateStr = toLocaleDateStr(now);

    const existing = queryOne('SELECT id FROM attendance WHERE user_id = ? AND date_str = ?', [req.user.id, dateStr]);
    if (existing) return res.status(400).json({ message: 'Anda sudah melakukan Check-in hari ini!' });

    // Find nearest active location
    const { location: nearestLoc, distance, inRange } = findNearestLocation(lat, lng);
    const locationId = nearestLoc ? nearestLoc.id : null;

    // Get user's shift for late check
    const user = queryOne('SELECT shift_id FROM users WHERE id = ?', [req.user.id]);
    let shift = null;
    if (user && user.shift_id) {
      shift = queryOne('SELECT * FROM shifts WHERE id = ? AND is_active = 1', [user.shift_id]);
    }

    const nowMinutes = timeStrToMinutes(toLocaleTimeStr(now));
    const checkInEndMinutes = shift ? timeStrToMinutes(shift.check_in_end) : timeStrToMinutes('08:30');
    const checkInStartMinutes = shift ? timeStrToMinutes(shift.check_in_start) : timeStrToMinutes('06:00');
    const isLate = nowMinutes > checkInEndMinutes;
    const lateMinutes = isLate ? nowMinutes - checkInEndMinutes : 0;
    const isEarly = nowMinutes < checkInStartMinutes;

    execute(
      `INSERT INTO attendance (user_id, date, date_str, check_in_time, check_out_time,
       check_in_photo, check_out_photo, check_in_lat, check_in_lng,
       check_out_lat, check_out_lng, distance_check_in, distance_check_out,
       is_out_of_range_check_in, is_out_of_range_check_out, status, notes, location_id, late_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, now.toISOString(), dateStr,
       toLocaleTimeStr(now), null,
       photo, null, lat, lng,
       null, null, distance, null,
       inRange ? 0 : 1, null,
       isLate ? 'Terlambat' : 'Tepat Waktu',
       !inRange ? 'Absen di luar radius kantor' : (isEarly ? 'Absen sebelum jam shift dimulai' : ''),
       locationId, lateMinutes]
    );

    const log = queryOne(`
      SELECT a.*, l.name as location_name
      FROM attendance a
      LEFT JOIN locations l ON a.location_id = l.id
      WHERE a.user_id = ? AND a.date_str = ?
    `, [req.user.id, dateStr]);
    res.json({ log });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

router.post('/checkout', (req, res) => {
  try {
    const { photo, lat, lng } = req.body;
    const now = new Date();
    const dateStr = toLocaleDateStr(now);

    const log = queryOne('SELECT * FROM attendance WHERE user_id = ? AND date_str = ?', [req.user.id, dateStr]);
    if (!log) return res.status(400).json({ message: 'Anda belum melakukan Check-in hari ini!' });
    if (log.check_out_time) return res.status(400).json({ message: 'Anda sudah melakukan Check-out hari ini!' });

    const { location: nearestLoc, distance, inRange } = findNearestLocation(lat, lng);

    const notes = (log.notes || '') +
      (!inRange ? (log.notes ? '; ' : '') + 'Check-out di luar radius kantor' : '');

    execute(
      `UPDATE attendance SET check_out_time=?, check_out_photo=?, check_out_lat=?, check_out_lng=?,
       distance_check_out=?, is_out_of_range_check_out=?, notes=? WHERE id=?`,
      [toLocaleTimeStr(now), photo, lat, lng, distance, inRange ? 0 : 1, notes, log.id]
    );

    const updatedLog = queryOne(`
      SELECT a.*, l.name as location_name
      FROM attendance a
      LEFT JOIN locations l ON a.location_id = l.id
      WHERE a.id = ?
    `, [log.id]);
    res.json({ log: updatedLog });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

router.get('/stats', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

    const now = new Date();
    const todayStr = toLocaleDateStr(now);

    const employees = queryAll("SELECT * FROM users WHERE (role = 'employee' OR role IS NULL) AND (is_active = 1 OR is_active IS NULL)");
    const logs = queryAll(`
      SELECT a.*, l.name as location_name
      FROM attendance a
      LEFT JOIN locations l ON a.location_id = l.id
      ORDER BY a.date DESC
    `);
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
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

router.get('/report', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });

    const { department_id, location_id, shift_id, start_date, end_date } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (department_id) { where += ' AND u.department_id = ?'; params.push(department_id); }
    if (location_id) { where += ' AND a.location_id = ?'; params.push(location_id); }
    if (shift_id) { where += ' AND u.shift_id = ?'; params.push(shift_id); }
    if (start_date) { where += ' AND a.date >= ?'; params.push(start_date); }
    if (end_date) { where += ' AND a.date <= ?'; params.push(end_date + 'T23:59:59.999Z'); }

    const logs = queryAll(`
      SELECT a.*, u.name as user_name, u.nik, u.position, d.name as dept_name,
             s.name as shift_name, l.name as location_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN shifts s ON u.shift_id = s.id
      LEFT JOIN locations l ON a.location_id = l.id
      ${where}
      ORDER BY a.date DESC, u.name ASC
    `, params);

    res.json({ logs });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

export default router;
