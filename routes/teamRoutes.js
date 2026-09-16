import { Router } from 'express';
import auth from '../middleware/auth.js';
import { getTeams, getTeamDetail, createTeam, joinTeam, leaveTeam } from '../controllers/teamController.js';

const router = Router();

router.get('/', getTeams);
router.get('/:teamId', getTeamDetail);
router.post('/', auth(), createTeam);
router.post('/:teamId/join', auth(), joinTeam);
router.delete('/:teamId/leave', auth(), leaveTeam);

export default router;
