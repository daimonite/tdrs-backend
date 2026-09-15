import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getTeams, getTeamDetail, createTeam, joinTeam, leaveTeam } from '../controllers/teamController.js';

const router = Router();

router.get('/', getTeams);
router.get('/:teamId', getTeamDetail);
router.post('/', authenticate, createTeam);
router.post('/:teamId/join', authenticate, joinTeam);
router.delete('/:teamId/leave', authenticate, leaveTeam);

export default router;
