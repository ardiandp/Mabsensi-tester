import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, closeDb } from './db.js';
import { runMigrations } from './migrate.js';
import { runSeeds } from './seed.js';
import authRoutes from './routes/auth.js';
import attendanceRoutes from './routes/attendance.js';
import officeRoutes from './routes/office.js';
import usersRoutes from './routes/users.js';
import departmentsRoutes from './routes/departments.js';
import locationsRoutes from './routes/locations.js';
import rolesRoutes from './routes/roles.js';
import shiftsRoutes from './routes/shifts.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminPath = path.join(__dirname, '..', 'admin');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/office', officeRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/shifts', shiftsRoutes);

app.use('/admin', express.static(adminPath));
app.use('/admin', adminRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', '..', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  });
}

async function start() {
  await initDb();
  runMigrations();
  await runSeeds();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

process.on('SIGINT', () => { closeDb(); process.exit(); });
process.on('SIGTERM', () => { closeDb(); process.exit(); });

start();
