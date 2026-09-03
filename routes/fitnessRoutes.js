import express from 'express';
import { getFitnessSyncStatus, syncStravaActivity } from '../controllers/fitnessController.js';

const router = express.Router();

router.get('/status', getFitnessSyncStatus);
router.post('/strava/sync', syncStravaActivity);

export default router;
