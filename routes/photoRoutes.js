import { Router } from 'express';
import { getPhotos, searchPhotosByBib } from '../controllers/photoController.js';

const router = Router();

router.get('/', getPhotos);
router.get('/bib/:bib_number', searchPhotosByBib);

export default router;
