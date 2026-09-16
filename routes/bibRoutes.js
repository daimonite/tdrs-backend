import { Router } from 'express';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { getBib, getMyBib, generateBib } from '../controllers/bibController.js';

const router = Router();

router.get('/me', auth(), getMyBib);
router.get('/:identifier', getBib);
router.post('/generate', auth(), requireRole(['admin']), generateBib);

export default router;
