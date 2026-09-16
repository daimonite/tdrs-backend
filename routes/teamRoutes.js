import { Router } from 'express';
import auth from '../middleware/auth.js';
import { getTeams, getTeamDetail, createTeam, joinTeam, leaveTeam, updateTeam } from '../controllers/teamController.js';

const router = Router();

router.get('/', getTeams);
router.get('/:teamId', getTeamDetail);
router.post('/', auth(), createTeam);
router.patch('/:teamId', auth(), updateTeam);
router.post('/:teamId/join', auth(), joinTeam);
router.delete('/:teamId/leave', auth(), leaveTeam);

export default router;
