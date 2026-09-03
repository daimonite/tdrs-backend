import express from 'express';
import { getTwibbonFrames, generateTwibbon, getOpenGraphCard } from '../controllers/socialController.js';

const router = express.Router();

router.get('/twibbon/frames', getTwibbonFrames);
router.post('/twibbon/generate', generateTwibbon);
router.get('/og/:bib_or_id', getOpenGraphCard);

export default router;
