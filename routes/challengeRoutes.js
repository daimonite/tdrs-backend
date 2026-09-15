import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getChallenges, joinChallenge, completeChallenge, getChallengeLeaderboard } from '../controllers/challengeController.js';

const router = Router();

router.get('/', getChallenges);
router.post('/:challengeId/join', authenticate, joinChallenge);
router.patch('/:challengeId/complete', authenticate, completeChallenge);
router.get('/:challengeId/leaderboard', getChallengeLeaderboard);

export default router;
