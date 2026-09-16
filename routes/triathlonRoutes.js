import express from 'express';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  getTriathlonOverview,
  getLiveActivity,
  getCourseMap,
  getCommunityImpact,
  updateLifecycleMode
} from '../controllers/triathlonController.js';

const router = express.Router();

router.get('/overview', getTriathlonOverview);
router.get('/live-activity', getLiveActivity);
router.get('/map', getCourseMap);
router.get('/impact', getCommunityImpact);
router.patch('/lifecycle', auth(), requireRole(['admin']), updateLifecycleMode);

export default router;
