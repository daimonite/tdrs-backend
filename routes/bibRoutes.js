import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getBib, getMyBib, generateBib } from '../controllers/bibController.js';

const router = Router();

router.get('/me', authenticate, getMyBib);
router.get('/:identifier', getBib);
router.post('/generate', authenticate, authorize(['hq_admin', 'admin']), generateBib);

export default router;
