import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getResults, getLeaderboard, getMyResult } from '../controllers/resultsController.js';

const router = Router();

router.get('/', getResults);
router.get('/leaderboard', getLeaderboard);
router.get('/me', authenticate, getMyResult);

export default router;
