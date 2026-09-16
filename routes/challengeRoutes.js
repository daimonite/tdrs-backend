import { Router } from 'express';
import auth from '../middleware/auth.js';
import { getChallenges, joinChallenge, completeChallenge, getChallengeLeaderboard } from '../controllers/challengeController.js';

const router = Router();

router.get('/', getChallenges);
router.post('/:challengeId/join', auth(), joinChallenge);
router.patch('/:challengeId/complete', auth(), completeChallenge);
router.get('/:challengeId/leaderboard', getChallengeLeaderboard);

export default router;
