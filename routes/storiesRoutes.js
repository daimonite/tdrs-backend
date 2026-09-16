import { Router } from 'express';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { getStories, submitStory, approveStory } from '../controllers/whyIParticipateController.js';

const router = Router();

router.get('/', getStories);
router.post('/', auth(), submitStory);
router.patch('/:storyId/approve', auth(), requireRole(['admin']), approveStory);

export default router;
