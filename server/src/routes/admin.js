import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminPath = path.join(__dirname, '..', '..', 'admin');

const router = Router();

router.get('/', (req, res) => {
  res.sendFile(path.join(adminPath, 'index.html'));
});

export default router;
