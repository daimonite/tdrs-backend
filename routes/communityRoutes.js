import { Router } from 'express';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  getPosts,
  createPost,
  reactToPost,
  addComment,
  getComments,
  reportPost,
  getPostReports,
  moderatePost
} from '../controllers/communityController.js';

const router = Router();

// Public read (memory/archive modes keep these readable)
router.get('/posts', getPosts);
router.get('/posts/:postId/comments', getComments);

// Social writes — lifecycle-gated inside the controller (§17)
router.post('/posts', auth(), createPost);
router.post('/posts/:postId/react', auth(), reactToPost);
router.post('/posts/:postId/comments', auth(), addComment);

// §15 — every signed-in participant can report
router.post('/posts/:postId/report', auth(), reportPost);

// §15 — moderation queue and decisions, admin only
router.get('/reports', auth(), requireRole(['admin']), getPostReports);
router.patch('/posts/:postId/moderate', auth(), requireRole(['admin']), moderatePost);

export default router;
