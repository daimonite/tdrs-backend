import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import { getPosts, createPost, reactToPost, addComment, getComments } from '../controllers/communityController.js';

const router = Router();

router.get('/posts', getPosts);
router.post('/posts', authenticate, createPost);
router.post('/posts/:postId/react', authenticate, reactToPost);
router.get('/posts/:postId/comments', getComments);
router.post('/posts/:postId/comments', authenticate, addComment);

export default router;
