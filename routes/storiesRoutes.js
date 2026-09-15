import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getStories, submitStory, approveStory } from '../controllers/whyIParticipateController.js';

const router = Router();

router.get('/', getStories);
router.post('/', authenticate, submitStory);
router.patch('/:storyId/approve', authenticate, authorize(['hq_admin', 'admin']), approveStory);

export default router;
