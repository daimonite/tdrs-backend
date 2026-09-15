import express from 'express';
import {
  getTriathlonOverview,
  getLiveActivity,
  getCourseMap,
  getCommunityImpact
} from '../controllers/triathlonController.js';

const router = express.Router();

router.get('/overview', getTriathlonOverview);
router.get('/live-activity', getLiveActivity);
router.get('/map', getCourseMap);
router.get('/impact', getCommunityImpact);

export default router;
